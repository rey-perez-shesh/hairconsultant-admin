"use client";

import { collection, orderBy, query, where } from "firebase/firestore";
import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/firebase";
import { formatDate, formatNumber } from "@/lib/format";
import { useGlobalStats } from "@/lib/hooks";
import { usePagedQuery } from "@/lib/paged";
import { label, type UserProfile } from "@/lib/model";

const PAGE_SIZE = 25;

export default function UsersPage() {
  const { data: stats } = useGlobalStats();
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  // Email search is a prefix match (Firestore has no full-text search); otherwise newest first.
  const base = useMemo(
    () =>
      activeSearch
        ? query(
            collection(db, "users"),
            where("email", ">=", activeSearch),
            where("email", "<=", `${activeSearch}\uf8ff`),
            orderBy("email"),
          )
        : query(collection(db, "users"), orderBy("createdAtEpochMillis", "desc")),
    [activeSearch],
  );
  const { rows, hasMore, loading, loadingMore, loadMore } = usePagedQuery<UserProfile>(base, PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Users"
        description={`${formatNumber(stats?.users?.total)} registered app users`}
      />

      <form
        className="mb-4 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setActiveSearch(search.trim().toLowerCase());
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Email starts with…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search by email"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {activeSearch && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearch("");
              setActiveSearch("");
            }}
          >
            Clear
          </Button>
        )}
      </form>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="hidden md:table-cell">Gender</TableHead>
              <TableHead className="hidden lg:table-cell">Preferred hair</TableHead>
              <TableHead className="hidden sm:table-cell">Joined</TableHead>
              <TableHead className="hidden sm:table-cell">Last active</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {activeSearch ? "No users with an email starting with that." : "No users yet."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((u) => (
              <TableRow key={u.id} className="relative">
                <TableCell>
                  <Link href={`/users/detail?uid=${encodeURIComponent(u.id)}`} className="font-medium after:absolute after:inset-0">
                    {u.username || "(no username)"}
                  </Link>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{label(u.gender)}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {u.preferredHairLength || u.preferredHairTexture
                    ? [label(u.preferredHairLength), label(u.preferredHairTexture)].join(" · ")
                    : "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{formatDate(u.createdAtEpochMillis)}</TableCell>
                <TableCell className="hidden sm:table-cell">{formatDate(u.lastActiveAtEpochMillis)}</TableCell>
                <TableCell>
                  {u.disabled ? <Badge variant="destructive">Disabled</Badge> : <Badge variant="secondary">Active</Badge>}
                </TableCell>
                <TableCell>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="mt-4 flex justify-center">
        {hasMore && (
          <Button variant="outline" disabled={loadingMore} onClick={loadMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        )}
        {loading && rows.length === 0 && <p className="text-sm text-muted-foreground">Loading…</p>}
      </div>
    </>
  );
}
