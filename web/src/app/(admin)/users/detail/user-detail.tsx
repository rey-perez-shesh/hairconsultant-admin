"use client";

import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { ArrowLeft, Ban, Heart, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin-shell";
import { ConfirmDialog, FaceShapeTag, Stars } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, errorMessage } from "@/lib/admin-api";
import { db } from "@/lib/firebase";
import { formatDate, formatDateTime, formatPercent } from "@/lib/format";
import { useHaircuts } from "@/lib/hooks";
import { label, type Consultation, type Feedback, type UserProfile } from "@/lib/model";

function birthday(epochDay?: number) {
  return epochDay ? formatDate(epochDay * 86_400_000) : "—";
}

function Field({ name, value }: { name: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{name}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

type UserData = { user: UserProfile | null; consultations: Consultation[]; feedback: Feedback[] };

async function fetchUserData(uid: string): Promise<UserData> {
  const [userSnap, consultSnap, feedbackSnap] = await Promise.all([
    getDoc(doc(db, "users", uid)),
    getDocs(
      query(collection(db, "consultations"), where("userId", "==", uid), orderBy("createdAtEpochMillis", "desc"), limit(50)),
    ),
    getDocs(query(collection(db, "feedback"), where("userId", "==", uid), orderBy("createdAtEpochMillis", "desc"), limit(50))),
  ]);
  return {
    user: userSnap.exists() ? { ...(userSnap.data() as Omit<UserProfile, "id">), id: uid } : null,
    consultations: consultSnap.docs.map((d) => ({ ...(d.data() as Omit<Consultation, "id">), id: d.id })),
    feedback: feedbackSnap.docs.map((d) => ({ ...(d.data() as Omit<Feedback, "id">), id: d.id })),
  };
}

export function UserDetail() {
  const uid = useSearchParams().get("uid");
  const router = useRouter();
  const { data: haircuts } = useHaircuts();
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<(UserData & { key: string }) | null>(null);
  const [dialog, setDialog] = useState<"disable" | "enable" | "delete" | null>(null);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    fetchUserData(uid)
      .then((data) => active && setLoaded({ ...data, key: `${uid}:${version}` }))
      .catch((error) => active && toast.error(errorMessage(error)));
    return () => {
      active = false;
    };
  }, [uid, version]);

  if (!uid) return <p className="text-sm text-muted-foreground">No user selected.</p>;
  // Keep showing the previous data while a reload (after disable/enable) is in flight.
  if (!loaded || !loaded.key.startsWith(`${uid}:`)) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  const { user, consultations, feedback } = loaded;

  const haircutName = (id?: string | null) => (id ? haircuts.find((h) => h.id === id)?.name ?? id : null);
  const displayName = user?.username || user?.email || uid;

  return (
    <>
      <Link href="/users" className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-2 -ml-2" })}>
        <ArrowLeft /> Users
      </Link>
      <PageHeader
        title={displayName}
        description={user?.email}
        actions={
          <>
            {user?.disabled ? (
              <Button variant="outline" onClick={() => setDialog("enable")}>
                <ShieldCheck /> Enable account
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setDialog("disable")}>
                <Ban /> Disable account
              </Button>
            )}
            <Button variant="destructive" onClick={() => setDialog("delete")}>
              <Trash2 /> Delete user & data
            </Button>
          </>
        }
      />

      {!user && (
        <p className="mb-4 text-sm text-muted-foreground">
          This account has no profile document (it may have been deleted, or its registration didn&apos;t finish).
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Profile {user?.disabled && <Badge variant="attention">Disabled</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Field name="Gender" value={label(user?.gender)} />
              <Field name="Birthday" value={birthday(user?.birthdayEpochDay)} />
              <Field name="Joined" value={formatDate(user?.createdAtEpochMillis)} />
              <Field name="Last active" value={formatDate(user?.lastActiveAtEpochMillis)} />
              <Field name="Preferred length" value={label(user?.preferredHairLength)} />
              <Field name="Preferred texture" value={label(user?.preferredHairTexture)} />
              <Field name="Treatment" value={label(user?.preferredTreatment)} />
              <Field name="User id" value={<span className="font-mono text-xs break-all">{uid}</span>} />
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Consultations</CardTitle>
              <CardDescription>Latest {consultations.length} face scans and photo uploads</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {consultations.length === 0 && <p className="px-4 text-sm text-muted-foreground">No consultations yet.</p>}
              <ol className="border-t">
              {consultations.map((c) => (
                <li key={c.id} className="flex flex-wrap gap-4 border-b px-4 py-3 last:border-b-0">
                  {[c.sourceImageUrl, c.resultImageUrl].filter(Boolean).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src!}
                      alt={i === 0 ? "Uploaded photo" : "Try-on result"}
                      className="size-24 rounded-md bg-muted object-cover"
                      loading="lazy"
                    />
                  ))}
                  <div className="min-w-0 flex-1 space-y-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{label(c.source)}</Badge>
                      {c.isFavorite && (
                        <Badge variant="outline">
                          <Heart /> Favorite
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAtEpochMillis)}</span>
                    </div>
                    <p>
                      <FaceShapeTag shape={c.faceShape ?? ""} label={`${label(c.faceShape)} face`} className="text-sm" /> · {label(c.hairLength)} · {label(c.hairTexture)}
                      {c.hairColor && c.hairColor !== "OTHER" ? ` · ${label(c.hairColor)}` : ""}
                    </p>
                    {haircutName(c.selectedHaircutId) && (
                      <p className="text-muted-foreground">Chose: {haircutName(c.selectedHaircutId)}</p>
                    )}
                    {typeof c.faceShapeConfidence === "number" && (
                      <p className="text-xs text-muted-foreground">
                        Confidence — face {formatPercent(c.faceShapeConfidence)}, length{" "}
                        {formatPercent(c.hairLengthConfidence ?? null)}, texture{" "}
                        {formatPercent(c.hairTextureConfidence ?? null)}
                        {c.sourcesAgreed === false && c.verifierFaceShape
                          ? ` · second check said ${label(c.verifierFaceShape)}`
                          : ""}
                        {c.appVersion ? ` · app ${c.appVersion}` : ""}
                        {c.deviceModel ? ` · ${c.deviceModel}` : ""}
                      </p>
                    )}
                  </div>
                </li>
              ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedback.length === 0 && <p className="text-sm text-muted-foreground">No reviews from this user.</p>}
              {feedback.map((f) => (
                <div key={f.id} className="space-y-1 border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Stars rating={f.rating} />
                    <span className="text-xs text-muted-foreground">{formatDateTime(f.createdAtEpochMillis)}</span>
                  </div>
                  {f.comment && <p className="text-sm">{f.comment}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={dialog === "disable" || dialog === "enable"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={dialog === "enable" ? `Enable ${displayName}?` : `Disable ${displayName}?`}
        description={
          dialog === "enable"
            ? "They'll be able to sign in to the app again."
            : "They're signed out on every device and can't sign in or use the AI stylist until re-enabled. Their data is kept."
        }
        actionLabel={dialog === "enable" ? "Enable" : "Disable"}
        destructive={dialog === "disable"}
        onConfirm={async () => {
          try {
            await api.setUserDisabled({ uid, disabled: dialog === "disable" });
            toast.success(dialog === "disable" ? "Account disabled." : "Account enabled.");
            reload();
          } catch (error) {
            toast.error(errorMessage(error));
          }
        }}
      />

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Permanently delete ${displayName}?`}
        description="Deletes their sign-in account, profile, consultations, feedback, chat history and uploaded photos. This can't be undone. Use it for account-deletion requests under the Data Privacy Act."
        actionLabel="Delete everything"
        destructive
        confirmText="DELETE"
        onConfirm={async () => {
          try {
            const result = await api.deleteUserAccount({ uid });
            toast.success("User deleted.", {
              description: `${result.removed.consultations} consultations, ${result.removed.feedback} reviews and ${result.removed.chatMessages} chat messages removed.`,
            });
            router.push("/users");
          } catch (error) {
            toast.error(errorMessage(error));
          }
        }}
      />
    </>
  );
}
