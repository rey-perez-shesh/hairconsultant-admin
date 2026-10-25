import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { db } from "./common.js";
import { dayKey } from "./statsModel.js";

/** Set with: firebase functions:secrets:set GEMINI_API_KEY */
const geminiApiKey = defineSecret("GEMINI_API_KEY");

/** Only the calls the Android app makes are forwarded (see GeminiEndpoint.kt in the app). */
const ALLOWED_PATH =
  /^\/v1beta\/models\/(gemini-2\.5-flash|gemini-2\.5-flash-image|text-embedding-004):(generateContent|embedContent)$/;

const PER_MINUTE_LIMIT = 30;
const PER_DAY_LIMIT = 500;

/** Counts this request against the caller's limits; false once a limit is reached. */
async function withinRateLimit(uid: string, now: number): Promise<boolean> {
  const ref = db.doc(`rateLimits/${uid}`);
  const minute = Math.floor(now / 60_000);
  const day = dayKey(now);
  return db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() ?? {};
    const minuteCount = current.minute === minute ? (current.minuteCount as number) : 0;
    const dayCount = current.day === day ? (current.dayCount as number) : 0;
    if (minuteCount >= PER_MINUTE_LIMIT || dayCount >= PER_DAY_LIMIT) return false;
    tx.set(ref, { minute, minuteCount: minuteCount + 1, day, dayCount: dayCount + 1 });
    return true;
  });
}

async function recordUsage(model: string, now: number): Promise<void> {
  const day = dayKey(now);
  await Promise.all([
    db.doc("stats/global").set(
      { ai: { requests: FieldValue.increment(1), byModel: { [model]: FieldValue.increment(1) } } },
      { merge: true },
    ),
    db.doc(`statsDaily/${day}`).set({ date: day, aiRequests: FieldValue.increment(1) }, { merge: true }),
  ]);
}

/**
 * Forwards the app's Gemini REST calls with the server-held API key, so the key never ships in
 * the APK. Callers must send a Firebase ID token (`Authorization: Bearer <token>`); disabled or
 * deleted accounts are rejected because the token is checked for revocation.
 */
export const geminiProxy = onRequest(
  { secrets: [geminiApiKey], timeoutSeconds: 120, memory: "512MiB", maxInstances: 10 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "POST only" });
      return;
    }
    const match = ALLOWED_PATH.exec(req.path);
    if (!match) {
      res.status(404).json({ error: "Unknown Gemini endpoint" });
      return;
    }
    const token = /^Bearer (.+)$/.exec(req.get("authorization") ?? "")?.[1];
    if (!token) {
      res.status(401).json({ error: "Missing Firebase ID token" });
      return;
    }

    let uid: string;
    try {
      uid = (await getAuth().verifyIdToken(token, true)).uid;
    } catch {
      res.status(401).json({ error: "Invalid, expired, or revoked sign-in" });
      return;
    }

    const now = Date.now();
    if (!(await withinRateLimit(uid, now))) {
      res.status(429).json({ error: "Too many AI requests; try again shortly." });
      return;
    }

    const [, model, method] = match;
    try {
      const [upstream] = await Promise.all([
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": geminiApiKey.value() },
          body: new Uint8Array(req.rawBody),
        }),
        recordUsage(model, now),
      ]);
      res
        .status(upstream.status)
        .type(upstream.headers.get("content-type") ?? "application/json")
        .send(Buffer.from(await upstream.arrayBuffer()));
    } catch (error) {
      logger.error("Gemini proxy failed", error);
      res.status(502).json({ error: "Gemini request failed" });
    }
  },
);
