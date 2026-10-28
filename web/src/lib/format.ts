const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" });
const numberFormat = new Intl.NumberFormat("en-PH");

export const formatDate = (millis?: number | null) => (millis ? dateFormat.format(new Date(millis)) : "—");
export const formatDateTime = (millis?: number | null) => (millis ? dateTimeFormat.format(new Date(millis)) : "—");
const timeFormat = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dayFormat = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" });
export const formatDay = (millis?: number | null) => (millis ? dayFormat.format(new Date(millis)) : "—");
export const formatTime = (millis?: number | null) => (millis ? timeFormat.format(new Date(millis)) : "—");
export const formatNumber = (value?: number | null) => numberFormat.format(value ?? 0);
export const formatPercent = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)}%`);

/** YYYY-MM-DD in Philippine time — the statsDaily document id format (functions/src/statsModel.ts). */
export function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** The last [days] day keys, oldest first, ending today. */
export function recentDayKeys(days: number): string[] {
  const now = Date.now();
  return Array.from({ length: days }, (_, i) => dayKey(new Date(now - (days - 1 - i) * 86_400_000)));
}

export function shortDay(key: string): string {
  const [, month, day] = key.split("-").map(Number);
  return new Date(2000, month - 1, day).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n");
}

export function downloadText(filename: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}
