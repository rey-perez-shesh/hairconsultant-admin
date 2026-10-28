"use client";

import { collection, getCountFromServer, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, TodayChip } from "@/components/admin-shell";
import { ChartCard, DailyBars, FIGURE_STRIP, StatTile } from "@/components/charts";
import { BackfillButton, FACE_SHAPE_INK, FaceShapeTag, Stars } from "@/components/common";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { formatDay, formatNumber, formatTime, shortDay } from "@/lib/format";
import { useDailyStats, useGlobalStats } from "@/lib/hooks";
import { FACE_SHAPES, label, type Feedback } from "@/lib/model";

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

  const faceShapes = FACE_SHAPES.map((shape) => ({ shape, count: stats?.consultations?.byFaceShape?.[shape] ?? 0 }));
  const faceShapeTotal = faceShapes.reduce((total, f) => total + f.count, 0);

  return (
    <>
      <PageHeader
        title="Overview"
        description="How HairConsultant is being used right now."
        actions={
          <>
            <TodayChip />
            <BackfillButton />
          </>
        }
      />

      {!loading && !stats && (
        <Card className="mb-6">
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

      <div className={`${FIGURE_STRIP} grid-cols-2 md:grid-cols-3 xl:grid-cols-6`}>
        <StatTile label="Users" value={formatNumber(stats?.users?.total)} hint={`+${formatNumber(sum(last7, "newUsers"))} in the last 7 days`} />
        <StatTile label="Consultations" value={formatNumber(stats?.consultations?.total)} hint="All time" />
        <StatTile label="This week" value={formatNumber(sum(last7, "consultations"))} hint="Consultations, last 7 days" />
        <StatTile
          label="Satisfaction"
          value={avgRating === null ? "—" : `${avgRating.toFixed(1)} / 5`}
          hint={`${formatNumber(feedbackTotal)} reviews`}
        />
        <StatTile label="Active styles" value={activeStyles === null ? "—" : formatNumber(activeStyles)} hint="Shown in the app" />
        <StatTile label="AI stylist" value={formatNumber(sum(last7, "aiRequests"))} hint="Requests, last 7 days" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_384px]">
        <div className="min-w-0 space-y-6">
          <ChartCard
            title="Consultations per day"
            description="Face scans and photo uploads over the last 30 days, Philippine time. Today is in orange."
            data={consultationsSeries}
            valueLabel="Consultations"
            emptyText="No consultations in the last 30 days."
          >
            <DailyBars data={consultationsSeries} valueLabel="Consultations" />
          </ChartCard>

          <Card>
            <CardHeader>
              <CardTitle>Face shapes scanned</CardTitle>
              <CardDescription>All consultations, by the face shape the scanner found</CardDescription>
            </CardHeader>
            <CardContent>
              {faceShapeTotal === 0 ? (
                <p className="text-sm text-muted-foreground">No scans recorded yet.</p>
              ) : (
                <>
                  <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
                    {faceShapes.map(({ shape, count }) =>
                      count > 0 ? (
                        <span key={shape} className={FACE_SHAPE_INK[shape]} style={{ flexGrow: count }} />
                      ) : null,
                    )}
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-y-3 sm:grid-cols-5">
                    {faceShapes.map(({ shape, count }) => (
                      <div key={shape}>
                        <dt>
                          <FaceShapeTag shape={shape} label={label(shape)} />
                        </dt>
                        <dd className="mt-1 text-lg leading-none font-semibold">
                          {Math.round((count / faceShapeTotal) * 100)}%
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">{formatNumber(count)}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Latest feedback</CardTitle>
            <CardDescription>{formatNumber(feedbackTotal)} reviews in total</CardDescription>
          </CardHeader>
          <CardContent>
            {recentFeedback.length === 0 && (
              <p className="text-sm text-muted-foreground">No reviews yet. They appear here as soon as someone rates a style in the app.</p>
            )}
            <ol className="-my-1">
              {recentFeedback.map((f) => (
                <li key={f.id} className="space-y-1 border-b py-3 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <Stars rating={f.rating} />
                    <time className="text-xs text-muted-foreground">
                      {formatDay(f.createdAtEpochMillis)}, {formatTime(f.createdAtEpochMillis)}
                    </time>
                  </div>
                  <p className="line-clamp-2 text-sm">
                    {f.comment || <span className="text-muted-foreground">No comment</span>}
                  </p>
                </li>
              ))}
            </ol>
            <Link href="/feedback" className={buttonVariants({ variant: "outline", className: "mt-3 w-full" })}>
              View all feedback
            </Link>
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="size-3.5" /> Totals update live as the app writes data.
      </p>
    </>
  );
}
