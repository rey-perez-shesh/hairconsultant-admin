import { DocumentData, FieldPath, FieldValue, Query } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { audit, db, requireAdmin } from "./common.js";
import {
  Contributions,
  DocData,
  consultationContributions,
  dayKey,
  diffContributions,
  feedbackContributions,
  mergeInto,
  toNested,
  userContributions,
} from "./statsModel.js";

const GLOBAL_STATS = "stats/global";

type DailyFields = Record<string, number>;

/** Per-day counters a newly created document adds to statsDaily/{YYYY-MM-DD}. */
function dailyFieldsFor(collection: "consultations" | "feedback" | "users", doc: DocData): DailyFields {
  switch (collection) {
    case "consultations":
      return { consultations: 1 };
    case "feedback":
      return { feedback: 1, ratingSum: typeof doc.rating === "number" ? doc.rating : 0 };
    case "users":
      return { newUsers: 1 };
  }
}

function createdAt(doc: DocData): number {
  return typeof doc.createdAtEpochMillis === "number" && doc.createdAtEpochMillis > 0
    ? doc.createdAtEpochMillis
    : Date.now();
}

async function applyGlobal(diff: Contributions): Promise<void> {
  if (diff.size === 0) return;
  await db.doc(GLOBAL_STATS).set(
    { ...toNested(diff, (value) => FieldValue.increment(value)), updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

async function applyDaily(day: string, fields: DailyFields): Promise<void> {
  const increments = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, FieldValue.increment(value)]),
  );
  await db.doc(`statsDaily/${day}`).set({ date: day, ...increments }, { merge: true });
}

function statsTrigger(
  collection: "consultations" | "feedback" | "users",
  contributions: (doc: DocData | undefined) => Contributions,
) {
  return onDocumentWritten(`${collection}/{docId}`, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const work = [applyGlobal(diffContributions(contributions(before), contributions(after)))];
    if (!before && after) work.push(applyDaily(dayKey(createdAt(after)), dailyFieldsFor(collection, after)));
    await Promise.all(work);
  });
}

export const onConsultationWritten = statsTrigger("consultations", consultationContributions);
export const onFeedbackWritten = statsTrigger("feedback", feedbackContributions);
export const onUserWritten = statsTrigger("users", userContributions);

async function forEachDoc(query: Query, visit: (data: DocumentData) => void): Promise<number> {
  let count = 0;
  let last: string | undefined;
  for (;;) {
    let page = query.orderBy(FieldPath.documentId()).limit(1000);
    if (last) page = page.startAfter(last);
    const snapshot = await page.get();
    snapshot.docs.forEach((doc) => visit(doc.data()));
    count += snapshot.size;
    if (snapshot.size < 1000) return count;
    last = snapshot.docs[snapshot.docs.length - 1].id;
  }
}

/**
 * Recomputes stats/global and the per-day counters from every existing document. Run it once
 * after the first deploy (data created before the triggers existed isn't counted otherwise),
 * and any time the numbers look off — trigger retries can occasionally double-count.
 */
export const backfillStats = onCall({ timeoutSeconds: 540, memory: "1GiB" }, async (request) => {
  requireAdmin(request);
  const totals: Contributions = new Map();
  const daily = new Map<string, DailyFields>();
  const addDaily = (day: string, fields: DailyFields) => {
    const row = daily.get(day) ?? { consultations: 0, feedback: 0, ratingSum: 0, newUsers: 0 };
    for (const [key, value] of Object.entries(fields)) row[key] = (row[key] ?? 0) + value;
    daily.set(day, row);
  };

  const counts: Record<string, number> = {};
  for (const [collection, contributions] of [
    ["consultations", consultationContributions],
    ["feedback", feedbackContributions],
    ["users", userContributions],
  ] as const) {
    counts[collection] = await forEachDoc(db.collection(collection), (data) => {
      mergeInto(totals, contributions(data));
      addDaily(dayKey(createdAt(data)), dailyFieldsFor(collection, data));
    });
  }

  // AI usage is only ever counted live by geminiProxy, so carry it over instead of zeroing it.
  const existing = (await db.doc(GLOBAL_STATS).get()).data();
  await db.doc(GLOBAL_STATS).set({
    ...toNested(totals, (value) => value),
    ...(existing?.ai ? { ai: existing.ai } : {}),
    updatedAt: FieldValue.serverTimestamp(),
    backfilledAt: FieldValue.serverTimestamp(),
  });

  const days = [...daily.entries()];
  for (let i = 0; i < days.length; i += 400) {
    const batch = db.batch();
    days.slice(i, i + 400).forEach(([day, fields]) => {
      batch.set(db.doc(`statsDaily/${day}`), { date: day, ...fields }, { merge: true });
    });
    await batch.commit();
  }

  await audit(request, "stats.backfill", {}, counts);
  return counts;
});
