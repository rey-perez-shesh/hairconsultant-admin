/**
 * Preview-mode stand-in for "firebase/functions": the admin callables from functions/src/admin.ts,
 * acting on the in-memory store.
 */
import { getAuth } from "./auth";
import { commit, listDocs, readDoc, type Data, type WriteOp } from "./store";
import { Timestamp } from "./timestamp";

let logCount = 0;

function audit(action: string, target: Data, details: Data = {}): WriteOp {
  const user = getAuth().currentUser;
  return {
    kind: "set",
    collectionPath: "auditLogs",
    id: `preview-log-${Date.now()}-${++logCount}`,
    data: { action, actorUid: user?.uid, actorEmail: user?.email, target, details, at: Timestamp.now() },
  };
}

const handlers: Record<string, (data: never) => unknown> = {
  bootstrapAdmin: () => ({ ok: true }),

  setAdminRole: ({ email, admin }: { email: string; admin: boolean }) => {
    const known = new Map<string, string>(listDocs("users").map((u) => [String(u.data.email), u.id]));
    const members = { ...((readDoc("config", "admins")?.members as Record<string, Data>) ?? {}) };
    const existing = Object.entries(members).find(([, m]) => m.email === email)?.[0];
    const uid = existing ?? known.get(email);
    if (!uid) throw new Error(`No account with the email ${email}. (Preview mode has no user accounts.)`);
    if (admin) members[uid] = { email, grantedAt: Timestamp.now(), grantedBy: getAuth().currentUser?.uid };
    else delete members[uid];
    commit([
      { kind: "set", collectionPath: "config", id: "admins", data: { members } },
      audit(admin ? "admin.grant" : "admin.revoke", { uid, email }),
    ]);
    return { ok: true, uid };
  },

  setUserDisabled: ({ uid, disabled }: { uid: string; disabled: boolean }) => {
    const user = readDoc("users", uid);
    commit([
      { kind: "update", collectionPath: "users", id: uid, data: { disabled } },
      audit(disabled ? "user.disable" : "user.enable", { uid, email: user?.email }),
    ]);
    return { ok: true };
  },

  deleteUserAccount: ({ uid }: { uid: string }) => {
    const user = readDoc("users", uid);
    const owned = (path: string) =>
      listDocs(path)
        .filter((d) => d.data.userId === uid)
        .map((d): WriteOp => ({ kind: "delete", collectionPath: path, id: d.id }));
    const consultations = owned("consultations");
    const feedback = owned("feedback");
    commit([
      { kind: "delete", collectionPath: "users", id: uid },
      ...consultations,
      ...feedback,
      audit("user.delete", { uid, email: user?.email }),
    ]);
    return { ok: true, removed: { consultations: consultations.length, feedback: feedback.length, chatMessages: 0 } };
  },

  // Real stats come from the Cloud Functions; preview only reports what there is to count.
  backfillStats: () => {
    const counts = {
      users: listDocs("users").length,
      consultations: listDocs("consultations").length,
      feedback: listDocs("feedback").length,
    };
    commit([audit("stats.backfill", {}, counts)]);
    return counts;
  },
};

export function getFunctions() {
  return { type: "functions" };
}

export function connectFunctionsEmulator() {}

export function httpsCallable(_functions: unknown, name: string) {
  return async (data: unknown) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const handler = handlers[name];
    if (!handler) throw new Error(`Preview mode has no fake for the ${name} function.`);
    return { data: handler(data as never) };
  };
}
