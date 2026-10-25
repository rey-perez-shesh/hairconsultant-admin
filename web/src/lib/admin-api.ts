"use client";

import { doc, collection, serverTimestamp, type WriteBatch } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "./firebase";

/** Adds an auditLogs entry to [batch], so the change and its log commit together. */
export function auditInBatch(
  batch: WriteBatch,
  action: string,
  target: Record<string, unknown>,
  details: Record<string, unknown> = {},
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  batch.set(doc(collection(db, "auditLogs")), {
    action,
    actorUid: user.uid,
    actorEmail: user.email,
    target,
    details,
    at: serverTimestamp(),
  });
}

function callable<Req, Res>(name: string) {
  const fn = httpsCallable<Req, Res>(functions, name);
  return async (data: Req) => (await fn(data)).data;
}

export const api = {
  bootstrapAdmin: callable<void, { ok: boolean }>("bootstrapAdmin"),
  setAdminRole: callable<{ email: string; admin: boolean }, { ok: boolean; uid: string }>("setAdminRole"),
  setUserDisabled: callable<{ uid: string; disabled: boolean }, { ok: boolean }>("setUserDisabled"),
  deleteUserAccount: callable<{ uid: string }, { ok: boolean; removed: Record<string, number> }>("deleteUserAccount"),
  backfillStats: callable<void, Record<string, number>>("backfillStats"),
};

/** Readable message from a Firebase/callable error. */
export function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message).replace(/^Firebase: /, "");
  }
  return "Something went wrong.";
}
