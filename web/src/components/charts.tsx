"use client";

import { Table2, BarChart3 } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";

export type Datum = { label: string; value: number };

/** Theme tokens resolved to real colors for Recharts (SVG attributes can't take var()). */
function useChartTokens() {
  const { resolvedTheme } = useTheme();
  // Re-read when the theme flips; charts only draw client-side (after measuring), so no SSR mismatch.
  return useMemo(() => {
    const style = typeof document === "undefined" ? null : getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) => style?.getPropertyValue(name).trim() || fallback;
    return {
      series: read("--series-1", "#2a78d6"),
      grid: read("--chart-grid", "#e5e5e5"),
      text: read("--muted-foreground", "#737373"),
      surface: read("--card", "#ffffff"),
      theme: resolvedTheme,
    };
  }, [resolvedTheme]);
}

function ChartTooltip({
  active,
  payload,
  label,
  valueLabel,
  format,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string | number;
  valueLabel: string;
  format: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-popover-foreground">{label}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
        <span className="size-2 rounded-full bg-series-1" />
        {valueLabel}: <span className="font-medium text-popover-foreground">{format(Number(payload[0].value))}</span>
      </div>
    </div>
  );
}

/** Card with a chart/table switch, so every chart's numbers are also readable as text. */
export function ChartCard({
  title,
  description,
  data,
  valueLabel,
  format = formatNumber,
  emptyText = "No data yet.",
  children,
}: {
  title: string;
  description?: string;
  data: Datum[];
  valueLabel: string;
  format?: (value: number) => string;
  emptyText?: string;
  children: React.ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  const empty = data.length === 0 || data.every((d) => d.value === 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={asTable ? "Show chart" : "Show table"}
            title={asTable ? "Show chart" : "Show table"}
            onClick={() => setAsTable((v) => !v)}
          >
            {asTable ? <BarChart3 /> : <Table2 />}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : asTable ? (
          <div className="max-h-72 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">{valueLabel}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.label}>
                    <TableCell>{d.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{format(d.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/** Horizontal bars for a magnitude per category (one series, one hue). */
export function HorizontalBars({
  data,
  valueLabel,
  format = formatNumber,
}: {
  data: Datum[];
  valueLabel: string;
  format?: (value: number) => string;
}) {
  const t = useChartTokens();
  const height = Math.max(120, data.length * 34 + 24);
  const labelWidth = Math.min(160, Math.max(64, ...data.map((d) => d.label.length * 7)));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke={t.grid} />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={labelWidth}
            tickLine={false}
            axisLine={false}
            tick={{ fill: t.text, fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: t.grid, opacity: 0.5 }}
            content={<ChartTooltip valueLabel={valueLabel} format={format} />}
          />
          <Bar
            dataKey="value"
            isAnimationActive={false}
            fill={t.series}
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
            label={{ position: "right", fill: t.text, fontSize: 12, formatter: (v: unknown) => format(Number(v)) }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** One measure over days (x = day label), with a crosshair tooltip. */
export function TimeSeries({
  data,
  valueLabel,
  format = formatNumber,
  height = 240,
}: {
  data: Datum[];
  valueLabel: string;
  format?: (value: number) => string;
  height?: number;
}) {
  const t = useChartTokens();
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: t.text, fontSize: 12 }}
            minTickGap={24}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: t.text, fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: t.text, strokeDasharray: "3 3" }}
            content={<ChartTooltip valueLabel={valueLabel} format={format} />}
          />
          <Line
            isAnimationActive={false}
            type="linear"
            dataKey="value"
            stroke={t.series}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Headline number tile (no plot). */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {label}
          {Icon && <Icon className="size-4" />}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

/** Sorted, labelled data from a counts map, e.g. stats.consultations.byFaceShape. */
export function countsToData(
  counts: Record<string, number> | undefined,
  labelFor: (key: string) => string = (k) => k,
  order?: readonly string[],
): Datum[] {
  const entries = Object.entries(counts ?? {}).filter(([, v]) => v > 0);
  const rows = entries.map(([key, value]) => ({ key, label: labelFor(key), value }));
  if (order) rows.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  else rows.sort((a, b) => b.value - a.value);
  return rows.map(({ label, value }) => ({ label, value }));
}
