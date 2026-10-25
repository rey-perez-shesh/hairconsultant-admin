"use client";

import { collection, doc, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { UserMinus, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin-shell";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage } from "@/lib/admin-api";
import { db } from "@/lib/firebase";
import { formatDateTime } from "@/lib/format";
import { usePagedQuery } from "@/lib/paged";

type AdminMember = { email: string; grantedAt?: Timestamp; grantedBy?: string };
type AuditEntry = {
  id: string;
  action: string;
  actorEmail?: string | null;
  target?: Record<string, unknown>;
  details?: Record<string, unknown>;
  at?: Timestamp;
};

const ACTION_LABELS: Record<string, string> = {
  "admin.bootstrap": "Became the first admin",
  "admin.grant": "Granted admin",
  "admin.revoke": "Revoked admin",
  "user.disable": "Disabled user",
  "user.enable": "Enabled user",
  "user.delete": "Deleted user & data",
  "haircut.create": "Created style",
  "haircut.update": "Edited style",
  "haircut.delete": "Deleted style",
  "haircut.show": "Showed style",
  "haircut.hide": "Hid style",
  "haircut.upgradeLegacy": "Upgraded legacy styles",
  "haircut.importThumbnail": "Imported thumbnail",
  "stats.backfill": "Recalculated stats",
};

function describeTarget(entry: AuditEntry): string {
  const t = entry.target ?? {};
  return String(t.name ?? t.email ?? t.haircutId ?? t.uid ?? "");
}

export default function AdminsPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Record<string, AdminMember>>({});
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<AdminMember | null>(null);

  useEffect(
    () => onSnapshot(doc(db, "config/admins"), (snap) => setMembers((snap.data()?.members as Record<string, AdminMember>) ?? {})),
    [],
  );

  const logQuery = useMemo(() => query(collection(db, "auditLogs"), orderBy("at", "desc")), []);
  const { rows: log, hasMore, loadMore, reload: reloadLog } = usePagedQuery<AuditEntry>(logQuery, 30);

  const grant = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.setAdminRole({ email: email.trim(), admin: true });
      toast.success(`${email.trim()} is now an admin.`, { description: "They may need to sign out and back in." });
      setEmail("");
      reloadLog();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Admins & audit" description="Who can use this dashboard, and everything they've changed." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Admins</CardTitle>
            <CardDescription>The account must already exist (registered in the app or Firebase console).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={grant} className="flex gap-2">
              <Input
                type="email"
                required
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email to make admin"
              />
              <Button type="submit" disabled={busy}>
                <UserPlus /> Add
              </Button>
            </form>
            <ul className="divide-y">
              {Object.entries(members).map(([uid, member]) => (
                <li key={uid} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.email} {uid === user?.uid && <Badge variant="secondary">You</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Since {formatDateTime(member.grantedAt?.toMillis())}
                    </p>
                  </div>
                  {uid !== user?.uid && (
                    <Button variant="ghost" size="sm" onClick={() => setRevoking(member)}>
                      <UserMinus /> Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="pt-4">
            <CardTitle>Audit log</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>What</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    Nothing logged yet.
                  </TableCell>
                </TableRow>
              )}
              {log.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-xs">{formatDateTime(entry.at?.toMillis())}</TableCell>
                  <TableCell className="text-xs">{entry.actorEmail ?? "—"}</TableCell>
                  <TableCell className="whitespace-normal">
                    <span className="font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                    {describeTarget(entry) && <span className="text-muted-foreground"> · {describeTarget(entry)}</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {hasMore && (
            <div className="flex justify-center pb-4">
              <Button variant="outline" size="sm" onClick={loadMore}>
                Load more
              </Button>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={`Remove ${revoking?.email} as admin?`}
        description="They lose dashboard access the next time their session refreshes (within an hour, or immediately on sign-in). Their app account is unaffected."
        actionLabel="Remove admin"
        destructive
        onConfirm={async () => {
          try {
            await api.setAdminRole({ email: revoking!.email, admin: false });
            toast.success("Admin removed.");
            reloadLog();
          } catch (error) {
            toast.error(errorMessage(error));
          }
        }}
      />
    </>
  );
}
