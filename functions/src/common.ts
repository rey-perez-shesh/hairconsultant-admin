import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { CallableRequest, HttpsError } from "firebase-functions/v2/https";

if (getApps().length === 0) initializeApp();

export const db = getFirestore();

/** Rejects callers without the `admin` custom claim; returns their uid. */
export function requireAdmin(request: CallableRequest<unknown>): string {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  if (request.auth.token.admin !== true) throw new HttpsError("permission-denied", "Admins only.");
  return request.auth.uid;
}

export function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `${name} is required.`);
  }
  return value.trim();
}

/** Appends to the append-only auditLogs collection (also written by the dashboard for catalog edits). */
export async function audit(
  request: CallableRequest<unknown>,
  action: string,
  target: Record<string, unknown>,
  details: Record<string, unknown> = {},
): Promise<void> {
  await db.collection("auditLogs").add({
    action,
    actorUid: request.auth?.uid ?? null,
    actorEmail: (request.auth?.token.email as string | undefined) ?? null,
    target,
    details,
    at: FieldValue.serverTimestamp(),
  });
}
