import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { defineString } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { audit, db, requireAdmin, requireString } from "./common.js";

const bootstrapAdminEmail = defineString("BOOTSTRAP_ADMIN_EMAIL");

/** config/admins.members: uid -> { email, grantedAt, grantedBy } (the dashboard's admin list). */
const ADMINS_DOC = "config/admins";

async function setAdminClaim(uid: string, admin: boolean): Promise<void> {
  const user = await getAuth().getUser(uid);
  const claims = { ...(user.customClaims ?? {}) };
  if (admin) claims.admin = true;
  else delete claims.admin;
  await getAuth().setCustomUserClaims(uid, claims);
}

/**
 * One-time setup: makes the caller the first admin, if their verified email matches
 * BOOTSTRAP_ADMIN_EMAIL and no admin exists yet. Afterwards admins are managed with setAdminRole.
 */
export const bootstrapAdmin = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const email = (request.auth.token.email ?? "").toLowerCase();
  const allowed = bootstrapAdminEmail.value().trim().toLowerCase();
  if (!allowed || allowed === "you@example.com") {
    throw new HttpsError("failed-precondition", "Set BOOTSTRAP_ADMIN_EMAIL in functions/.env and redeploy.");
  }
  if (email !== allowed) throw new HttpsError("permission-denied", "This account isn't the bootstrap admin.");
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError("failed-precondition", "Verify this email address first.");
  }

  const adminsRef = db.doc(ADMINS_DOC);
  await db.runTransaction(async (tx) => {
    const members = (await tx.get(adminsRef)).data()?.members ?? {};
    if (Object.keys(members).length > 0) {
      throw new HttpsError("already-exists", "An admin already exists; ask them to grant you access.");
    }
    tx.set(adminsRef, {
      members: { [request.auth!.uid]: { email, grantedAt: FieldValue.serverTimestamp(), grantedBy: "bootstrap" } },
    });
  });
  await setAdminClaim(request.auth.uid, true);
  await audit(request, "admin.bootstrap", { uid: request.auth.uid, email });
  return { ok: true };
});

/** Grants or revokes the admin role by email. Admins can't revoke themselves (no lock-out). */
export const setAdminRole = onCall(async (request) => {
  const callerUid = requireAdmin(request);
  const data = (request.data ?? {}) as { email?: unknown; admin?: unknown };
  const email = requireString(data.email, "email").toLowerCase();
  const admin = data.admin === true;

  const user = await getAuth().getUserByEmail(email).catch(() => {
    throw new HttpsError("not-found", `No account uses ${email}. They need to register in the app first.`);
  });
  if (!admin && user.uid === callerUid) {
    throw new HttpsError("failed-precondition", "You can't remove your own admin role.");
  }

  await setAdminClaim(user.uid, admin);
  await db.doc(ADMINS_DOC).set(
    {
      members: {
        [user.uid]: admin
          ? { email, grantedAt: FieldValue.serverTimestamp(), grantedBy: callerUid }
          : FieldValue.delete(),
      },
    },
    { merge: true },
  );
  await audit(request, admin ? "admin.grant" : "admin.revoke", { uid: user.uid, email });
  return { ok: true, uid: user.uid };
});

async function requireManageableUser(callerUid: string, uid: string): Promise<void> {
  if (uid === callerUid) throw new HttpsError("failed-precondition", "You can't do this to your own account.");
  const user = await getAuth().getUser(uid).catch(() => null);
  if (user?.customClaims?.admin === true) {
    throw new HttpsError("failed-precondition", "Remove this account's admin role first.");
  }
}

/** Blocks (or unblocks) sign-in for an app user and signs them out everywhere. */
export const setUserDisabled = onCall(async (request) => {
  const callerUid = requireAdmin(request);
  const data = (request.data ?? {}) as { uid?: unknown; disabled?: unknown };
  const uid = requireString(data.uid, "uid");
  const disabled = data.disabled === true;
  await requireManageableUser(callerUid, uid);

  await getAuth().updateUser(uid, { disabled });
  if (disabled) await getAuth().revokeRefreshTokens(uid);
  await db.doc(`users/${uid}`).set({ disabled }, { merge: true });
  await audit(request, disabled ? "user.disable" : "user.enable", { uid });
  return { ok: true };
});

async function deleteWhere(collection: string, uid: string): Promise<number> {
  let deleted = 0;
  for (;;) {
    const snapshot = await db.collection(collection).where("userId", "==", uid).limit(400).get();
    if (snapshot.empty) return deleted;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;
  }
}

/**
 * Permanently erases an app user: their sign-in account, profile, consultations, feedback,
 * chat history and uploaded photos (Data Privacy Act right to erasure).
 */
export const deleteUserAccount = onCall({ timeoutSeconds: 300 }, async (request) => {
  const callerUid = requireAdmin(request);
  const uid = requireString((request.data as { uid?: unknown } | undefined)?.uid, "uid");
  await requireManageableUser(callerUid, uid);

  const removed = {
    consultations: await deleteWhere("consultations", uid),
    feedback: await deleteWhere("feedback", uid),
    chatMessages: await deleteWhere("chatMessages", uid),
  };
  await getStorage().bucket().deleteFiles({ prefix: `users/${uid}/` });
  await db.doc(`users/${uid}`).delete();
  await db.doc(`rateLimits/${uid}`).delete();
  await getAuth().deleteUser(uid).catch((error: { code?: string }) => {
    if (error.code !== "auth/user-not-found") throw error;
  });
  await audit(request, "user.delete", { uid }, removed);
  return { ok: true, removed };
});
