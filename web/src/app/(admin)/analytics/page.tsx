"use client";

import { useState } from "react";
import { PageHeader } from "@/components/admin-shell";
import { ChartCard, countsToData, DailyBars, FIGURE_STRIP, HorizontalBars, StatTile } from "@/components/charts";
import { BackfillButton } from "@/components/common";
import { OptionSelect } from "@/components/filter-select";
import { formatNumber, formatPercent, shortDay } from "@/lib/format";
import { useDailyStats, useGlobalStats, useHaircuts } from "@/lib/hooks";
import { FACE_SHAPES, HAIR_LENGTHS, HAIR_TEXTURES, label } from "@/lib/model";

const RANGES = { "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days" };

export default function AnalyticsPage() {
  const [range, setRange] = useState("30");
  const { data: stats, loading } = useGlobalStats();
  const { data: daily } = useDailyStats(Number(range));
  const { data: haircuts } = useHaircuts();

  const c = stats?.consultations;
  const nameOf = (id: string) => haircuts.find((h) => h.id === id)?.name ?? id;
  const top = (counts?: Record<string, number>) => countsToData(counts, nameOf).slice(0, 10);

  const quality = c?.quality;
  const analysed = quality?.analysed ?? 0;
  const avg = (sum?: number) => (analysed > 0 ? (sum ?? 0) / analysed : null);

  const series = (field: "consultations" | "newUsers" | "aiRequests") =>
    daily.map((d) => ({ label: shortDay(d.date), value: d[field] ?? 0 }));

  const breakdowns = [
    {
      title: "Face shapes",
      data: countsToData(c?.byFaceShape, label, FACE_SHAPES),
      unit: "Consultations",
      ink: (shape: string) => `--face-${shape.toLowerCase()}`,
    },
    { title: "Hair length", data: countsToData(c?.byHairLength, label, ["BALD", ...HAIR_LENGTHS]), unit: "Consultations" },
    { title: "Hair texture", data: countsToData(c?.byHairTexture, label, HAIR_TEXTURES), unit: "Consultations" },
    { title: "How users consult", data: countsToData(c?.bySource, label), unit: "Consultations" },
    { title: "Users by gender", data: countsToData(stats?.users?.byGender, label), unit: "Users" },
    { title: "AI requests by model", data: countsToData(stats?.ai?.byModel), unit: "Requests" },
  ];

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Who uses HairConsultant, what the scanner finds, and which styles people pick."
        actions={
          <>
            <OptionSelect ariaLabel="Date range" className="w-40" value={range} onChange={setRange} options={RANGES} />
            <BackfillButton />
          </>
        }
      />

      {!loading && !stats && (
        <p className="mb-6 text-sm text-muted-foreground">No stats yet — use “Recalculate stats” to build them from existing data.</p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2 [&>*:first-child]:lg:col-span-2">
        {(
          [
            ["Consultations per day", "consultations", "Consultations"],
            ["New users per day", "newUsers", "New users"],
            ["AI stylist requests per day", "aiRequests", "Requests"],
          ] as const
        ).map(([title, field, unit]) => (
          <ChartCard key={field} title={title} description={RANGES[range as keyof typeof RANGES]} data={series(field)} valueLabel={unit}>
            <DailyBars data={series(field)} valueLabel={unit} height={180} />
          </ChartCard>
        ))}
      </div>

      <h2 className="mt-10 mb-3 text-xl font-semibold tracking-[-0.015em]">Scan results</h2>
      <div className="grid items-start gap-6 md:grid-cols-2">
        {breakdowns.map(({ title, data, unit, ink }) => (
          <ChartCard key={title} title={title} description="All time" data={data} valueLabel={unit}>
            <HorizontalBars data={data} valueLabel={unit} inkFor={ink} />
          </ChartCard>
        ))}
      </div>

      <h2 className="mt-10 mb-3 text-xl font-semibold tracking-[-0.015em]">Popular styles</h2>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ChartCard title="Most chosen after a consultation" description="Top 10, all time" data={top(c?.byHaircut)} valueLabel="Times chosen">
          <HorizontalBars data={top(c?.byHaircut)} valueLabel="Times chosen" />
        </ChartCard>
        <ChartCard
          title="Most favorited"
          description={`Top 10 · ${formatNumber(c?.favorites)} favorites in total`}
          data={top(c?.favoritesByHaircut)}
          valueLabel="Favorites"
          emptyText="No favorites synced yet (needs the updated app)."
        >
          <HorizontalBars data={top(c?.favoritesByHaircut)} valueLabel="Favorites" />
        </ChartCard>
      </div>

      <h2 className="mt-10 mb-1 text-xl font-semibold tracking-[-0.015em]">Classifier health</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Based on {formatNumber(analysed)} consultations from app versions that record confidence scores.
      </p>
      <div className={`${FIGURE_STRIP} grid-cols-2 lg:grid-cols-4`}>
        <StatTile label="Face shape confidence" value={formatPercent(avg(quality?.faceShapeConfidenceSum))} hint="Average" />
        <StatTile label="Hair length confidence" value={formatPercent(avg(quality?.hairLengthConfidenceSum))} hint="Average" />
        <StatTile label="Hair texture confidence" value={formatPercent(avg(quality?.hairTextureConfidenceSum))} hint="Average" />
        <StatTile
          label="Second check agreed"
          value={formatPercent(analysed > 0 ? (quality?.sourcesAgreed ?? 0) / analysed : null)}
          hint="ML Kit verifier matched the face shape"
        />
      </div>
    </>
  );
}
