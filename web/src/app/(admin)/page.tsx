"use client";

import { collection, getCountFromServer, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { CalendarCheck, Scissors, ScanFace, Sparkles, Star, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin-shell";
import { ChartCard, StatTile, TimeSeries } from "@/components/charts";
import { BackfillButton, Stars } from "@/components/common";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { formatDate, formatNumber, shortDay } from "@/lib/format";
import { useDailyStats, useGlobalStats } from "@/lib/hooks";
import type { Feedback } from "@/lib/model";

export default function OverviewPage() {
  const { data: stats, loading } = useGlobalStats();
  const { data: daily } = useDailyStats(30);
  const [activeStyles, setActiveStyles] = useState<number | null>(null);
  const [recentFeedback, setRecentFeedback] = useState<Feedback[]>([]);

  useEffect(() => {
    getCountFromServer(query(collection(db, "haircuts"), where("isActive", "==", true)))
      .then((snap) => setActiveStyles(snap.data().count))
      .catch(() => setActiveStyles(null));
    return onSnapshot(query(collection(db, "feedback"), orderBy("createdAtEpochMillis", "desc"), limit(5)), (snap) =>
      setRecentFeedback(snap.docs.map((d) => ({ ...(d.data() as Omit<Feedback, "id">), id: d.id }))),
    );
  }, []);

  const sum = (rows: typeof daily, field: "newUsers" | "consultations" | "aiRequests") =>
    rows.reduce((total, row) => total + (row[field] ?? 0), 0);
  const last7 = daily.slice(-7);
  const feedbackTotal = stats?.feedback?.total ?? 0;
  const avgRating = feedbackTotal > 0 ? (stats?.feedback?.ratingSum ?? 0) / feedbackTotal : null;
  const consultationsSeries = daily.map((d) => ({ label: shortDay(d.date), value: d.consultations ?? 0 }));

  return (
    <>
      <PageHeader
        title="Overview"
        description="How HairConsultant is being used right now."
        actions={<BackfillButton />}
      />

      {!loading && !stats && (
        <Card className="mb-6 border-dashed">
          <CardHeader>
            <CardTitle>No stats yet</CardTitle>
            <CardDescription>
              Stats are counted by Cloud Functions as users scan, upload and review. To include everything recorded
              before the functions were deployed, recalculate once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BackfillButton label="Calculate stats now" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Users" value={formatNumber(stats?.users?.total)} icon={Users} />
        <StatTile label="New users" value={formatNumber(sum(last7, "newUsers"))} hint="Last 7 days" icon={UserPlus} />
        <StatTile label="Consultations" value={formatNumber(stats?.consultations?.total)} icon={ScanFace} />
        <StatTile
          label="This week"
          value={formatNumber(sum(last7, "consultations"))}
          hint="Consultations, last 7 days"
          icon={CalendarCheck}
        />
        <StatTile
          label="Satisfaction"
          value={avgRating === null ? "—" : `${avgRating.toFixed(1)} / 5`}
          hint={`${formatNumber(feedbackTotal)} reviews`}
          icon={Star}
        />
        <StatTile
          label="Active styles"
          value={activeStyles === null ? "—" : formatNumber(activeStyles)}
          hint={`${formatNumber(sum(last7, "aiRequests"))} AI requests this week`}
          icon={Scissors}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <ChartCard
          title="Consultations per day"
          description="Face scans and photo uploads, last 30 days (Philippine time)"
          data={consultationsSeries}
          valueLabel="Consultations"
          emptyText="No consultations in the last 30 days."
        >
          <TimeSeries data={consultationsSeries} valueLabel="Consultations" />
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle>Latest feedback</CardTitle>
            <CardDescription>
              <Link href="/feedback" className="underline-offset-4 hover:underline">
                See all feedback
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentFeedback.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
            {recentFeedback.map((f) => (
              <div key={f.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Stars rating={f.rating} />
                  <span className="text-xs text-muted-foreground">{formatDate(f.createdAtEpochMillis)}</span>
                </div>
                <p className="line-clamp-2 text-sm">{f.comment || <span className="text-muted-foreground">No comment</span>}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="size-3.5" /> Totals update live as the app writes data.
      </p>
    </>
  );
}

