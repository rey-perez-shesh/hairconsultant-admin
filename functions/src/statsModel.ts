/**
 * Pure stats bookkeeping shared by the Firestore triggers and the backfill job.
 *
 * Each document contributes a set of counters ("contributions") to `stats/global`. A trigger
 * applies `after - before`, so creates, edits (e.g. a favorite toggled, a haircut picked after the
 * scan) and deletes all keep the totals right; the backfill just sums every document's contribution.
 *
 * Counter paths are arrays of map keys, e.g. ["consultations", "byFaceShape", "OVAL"], so ids and
 * model names containing dots stay literal keys instead of being read as nested field paths.
 */

export type DocData = Record<string, unknown>;
export type CounterPath = string[];
export type Contributions = Map<string, { path: CounterPath; value: number }>;

const SEP = "\u0000";

function add(target: Contributions, path: CounterPath, value: number): void {
  if (value === 0 || !Number.isFinite(value)) return;
  const key = path.join(SEP);
  const existing = target.get(key);
  target.set(key, { path, value: (existing?.value ?? 0) + value });
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function consultationContributions(doc: DocData | undefined): Contributions {
  const out: Contributions = new Map();
  if (!doc) return out;
  const c = "consultations";
  add(out, [c, "total"], 1);
  for (const [field, bucket] of [
    ["source", "bySource"],
    ["faceShape", "byFaceShape"],
    ["hairLength", "byHairLength"],
    ["hairTexture", "byHairTexture"],
  ] as const) {
    const value = str(doc[field]);
    if (value) add(out, [c, bucket, value], 1);
  }
  const haircutId = str(doc.selectedHaircutId);
  if (haircutId) add(out, [c, "byHaircut", haircutId], 1);
  if (doc.isFavorite === true) {
    add(out, [c, "favorites"], 1);
    if (haircutId) add(out, [c, "favoritesByHaircut", haircutId], 1);
  }
  // Classifier health: only documents written by app versions that record confidences count.
  const faceConf = num(doc.faceShapeConfidence);
  if (faceConf !== null) {
    add(out, [c, "quality", "analysed"], 1);
    add(out, [c, "quality", "faceShapeConfidenceSum"], faceConf);
    add(out, [c, "quality", "hairLengthConfidenceSum"], num(doc.hairLengthConfidence) ?? 0);
    add(out, [c, "quality", "hairTextureConfidenceSum"], num(doc.hairTextureConfidence) ?? 0);
    if (doc.sourcesAgreed === true) add(out, [c, "quality", "sourcesAgreed"], 1);
  }
  return out;
}

export function feedbackContributions(doc: DocData | undefined): Contributions {
  const out: Contributions = new Map();
  if (!doc) return out;
  const rating = num(doc.rating);
  add(out, ["feedback", "total"], 1);
  if (rating !== null) {
    add(out, ["feedback", "ratingSum"], rating);
    add(out, ["feedback", "byRating", String(Math.round(rating))], 1);
  }
  return out;
}

export function userContributions(doc: DocData | undefined): Contributions {
  const out: Contributions = new Map();
  if (!doc) return out;
  add(out, ["users", "total"], 1);
  const gender = str(doc.gender);
  if (gender) add(out, ["users", "byGender", gender], 1);
  return out;
}

/** after - before, dropping counters that didn't change. */
export function diffContributions(before: Contributions, after: Contributions): Contributions {
  const out: Contributions = new Map();
  for (const { path, value } of after.values()) add(out, path, value);
  for (const { path, value } of before.values()) add(out, path, -value);
  for (const [key, entry] of out) if (Math.abs(entry.value) < 1e-9) out.delete(key);
  return out;
}

export function mergeInto(target: Contributions, source: Contributions): void {
  for (const { path, value } of source.values()) add(target, path, value);
}

/** Builds the nested object Firestore expects, with each leaf produced by [leaf]. */
export function toNested<T>(contributions: Contributions, leaf: (value: number) => T): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const { path, value } of contributions.values()) {
    let node = root;
    path.slice(0, -1).forEach((key) => {
      node[key] = (node[key] as Record<string, unknown> | undefined) ?? {};
      node = node[key] as Record<string, unknown>;
    });
    node[path[path.length - 1]] = leaf(value);
  }
  return root;
}

/** Calendar day (YYYY-MM-DD) in the app's home timezone, used as the statsDaily document id. */
export function dayKey(epochMillis: number, timeZone = "Asia/Manila"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(epochMillis));
}
