"use client";

import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin-shell";
import { ChartCard, HorizontalBars, StatTile, TimeSeries } from "@/components/charts";
import { Stars } from "@/components/common";
import { OptionSelect } from "@/components/filter-select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage } from "@/lib/admin-api";
import { db } from "@/lib/firebase";
import { downloadText, formatDateTime, formatNumber, shortDay, toCsv } from "@/lib/format";
import { useDailyStats, useGlobalStats } from "@/lib/hooks";
import { usePagedQuery } from "@/lib/paged";
import type { Feedback } from "@/lib/model";

const PAGE_SIZE = 25;
const RATING_FILTERS = { ALL: "All ratings", "5": "5 stars", "4": "4 stars", "3": "3 stars", "2": "2 stars", "1": "1 star" };

function feedbackQuery(rating: string) {
  const base = collection(db, "feedback");
  return rating === "ALL"
    ? query(base, orderBy("createdAtEpochMillis", "desc"))
    : query(base, where("rating", "==", Number(rating)), orderBy("createdAtEpochMillis", "desc"));
}

export default function FeedbackPage() {
  const { data: stats } = useGlobalStats();
  const { data: daily } = useDailyStats(30);
  const [rating, setRating] = useState("ALL");
  const [emails, setEmails] = useState<Record<string, string>>({});
  const base = useMemo(() => feedbackQuery(rating), [rating]);
  const { rows, hasMore, loading, loadingMore, loadMore } = usePagedQuery<Feedback>(base, PAGE_SIZE);

  // Show reviewers' emails (feedback docs only carry the uid).
  useEffect(() => {
    const missing = [...new Set(rows.map((f) => f.userId))].filter((uid) => uid && !(uid in emails));
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (uid) => [uid, ((await getDoc(doc(db, "users", uid))).data()?.email as string) ?? ""] as const),
    )
      .then((found) => setEmails((current) => ({ ...current, ...Object.fromEntries(found) })))
      .catch(() => undefined);
  }, [rows, emails]);

  const exportCsv = async () => {
    try {
      const snap = await getDocs(query(feedbackQuery(rating), limit(5000)));
      const all = snap.docs.map((d) => ({ ...(d.data() as Omit<Feedback, "id">), id: d.id }));
      downloadText(
        `hairconsultant-feedback-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(
          all.map((f) => ({
            date: f.createdAtEpochMillis ? new Date(f.createdAtEpochMillis).toISOString() : "",
            rating: f.rating,
            comment: f.comment ?? "",
            userId: f.userId,
          })),
        ),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const total = stats?.feedback?.total ?? 0;
  const average = total > 0 ? (stats?.feedback?.ratingSum ?? 0) / total : null;
  const byRating = stats?.feedback?.byRating ?? {};
  const distribution = ["5", "4", "3", "2", "1"].map((r) => ({ label: `${r} ★`, value: byRating[r] ?? 0 }));
  const positive = total > 0 ? ((byRating["4"] ?? 0) + (byRating["5"] ?? 0)) / total : null;
  // Daily average only where there were reviews that day (no fake zeros).
  const trend = daily
    .filter((d) => (d.feedback ?? 0) > 0)
    .map((d) => ({ label: shortDay(d.date), value: Number(((d.ratingSum ?? 0) / (d.feedback ?? 1)).toFixed(2)) }));

  return (
    <>
      <PageHeader
        title="Feedback"
        description="Satisfaction ratings and reviews from the app's Profile screen."
        actions={
          <Button variant="outline" onClick={exportCsv}>
            <Download /> Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="Average rating" value={average === null ? "—" : `${average.toFixed(2)} / 5`} />
        <StatTile label="Reviews" value={formatNumber(total)} />
        <StatTile
          label="Satisfied"
          value={positive === null ? "—" : `${Math.round(positive * 100)}%`}
          hint="Rated 4 or 5 stars"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Rating distribution" data={distribution} valueLabel="Reviews">
          <HorizontalBars data={distribution} valueLabel="Reviews" />
        </ChartCard>
        <ChartCard
          title="Average rating per day"
          description="Days with at least one review, last 30 days"
          data={trend}
          valueLabel="Average rating"
          format={(v) => v.toFixed(2)}
          emptyText="No reviews in the last 30 days."
        >
          <TimeSeries data={trend} valueLabel="Average rating" format={(v) => v.toFixed(2)} />
        </ChartCard>
      </div>

      <div className="mt-8 mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Reviews</h2>
        <OptionSelect ariaLabel="Filter by rating" className="w-40" value={rating} onChange={setRating} options={RATING_FILTERS} />
      </div>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Rating</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead className="hidden md:table-cell">User</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No reviews match.
                </TableCell>
              </TableRow>
            )}
            {rows.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <Stars rating={f.rating} />
                </TableCell>
                <TableCell className="max-w-md whitespace-normal">
                  {f.comment || <span className="text-muted-foreground">No comment</span>}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Link href={`/users/detail?uid=${encodeURIComponent(f.userId)}`} className="hover:underline">
                    {emails[f.userId] || f.userId.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{formatDateTime(f.createdAtEpochMillis)}</TableCell>
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
      </div>
    </>
  );
}
