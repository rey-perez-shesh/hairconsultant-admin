import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { deleteObject, ref, uploadBytes } from "firebase/storage";

let env;

const haircut = (uid, overrides = {}) => ({
  name: "Curtains",
  description: "Soft middle part.",
  imageUrl: "",
  length: "SHORT",
  texture: "STRAIGHT",
  genderStyle: "UNISEX",
  treatment: "NONE",
  recommendedFaceShapes: ["OVAL"],
  arType: "AUTO",
  isActive: true,
  sortOrder: 1,
  updatedBy: uid,
  ...overrides,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-hairconsultant",
    firestore: { rules: readFileSync("../firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
    storage: { rules: readFileSync("../storage.rules", "utf8"), host: "127.0.0.1", port: 9199 },
  });
});

afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/alice"), { email: "alice@example.com", gender: "FEMALE" });
    await setDoc(doc(db, "users/bob"), { email: "bob@example.com", disabled: true });
    await setDoc(doc(db, "consultations/c1"), { userId: "alice", faceShape: "OVAL", isFavorite: false });
    await setDoc(doc(db, "feedback/f1"), { userId: "alice", rating: 5 });
    await setDoc(doc(db, "chatMessages/m1"), { userId: "alice", text: "hi" });
    await setDoc(doc(db, "haircuts/SHORT_STRAIGHT_1"), haircut("seed"));
    await setDoc(doc(db, "stats/global"), { users: { total: 2 } });
  });
});

const alice = () => env.authenticatedContext("alice").firestore();
const admin = () => env.authenticatedContext("admin1", { admin: true }).firestore();

describe("app users", () => {
  it("can still do everything the app does today", async () => {
    await assertSucceeds(getDoc(doc(alice(), "users/alice")));
    await assertSucceeds(setDoc(doc(alice(), "users/alice"), { username: "a" }, { merge: true }));
    await assertSucceeds(updateDoc(doc(alice(), "users/alice"), { lastActiveAtEpochMillis: 1 }));
    await assertSucceeds(setDoc(doc(alice(), "consultations/c2"), { userId: "alice", faceShapeConfidence: 0.7 }));
    await assertSucceeds(updateDoc(doc(alice(), "consultations/c1"), { isFavorite: true }));
    await assertSucceeds(setDoc(doc(alice(), "feedback/f2"), { userId: "alice", rating: 4 }));
    await assertSucceeds(getDoc(doc(alice(), "chatMessages/m1")));
    await assertSucceeds(getDoc(doc(alice(), "haircuts/SHORT_STRAIGHT_1")));
  });

  it("can no longer rewrite the catalog", async () => {
    await assertFails(setDoc(doc(alice(), "haircuts/SHORT_STRAIGHT_1"), haircut("alice")));
    await assertFails(deleteDoc(doc(alice(), "haircuts/SHORT_STRAIGHT_1")));
  });

  it("can't clear or set their own disabled flag", async () => {
    const bob = env.authenticatedContext("bob").firestore();
    await assertFails(updateDoc(doc(bob, "users/bob"), { disabled: false }));
    await assertFails(setDoc(doc(bob, "users/bob"), { username: "b" }));
    await assertSucceeds(setDoc(doc(bob, "users/bob"), { username: "b" }, { merge: true }));
    await assertFails(setDoc(doc(env.authenticatedContext("carol").firestore(), "users/carol"), { disabled: false }));
  });

  it("can't read other users' data, stats, or audit logs", async () => {
    const mallory = env.authenticatedContext("mallory").firestore();
    await assertFails(getDoc(doc(mallory, "users/alice")));
    await assertFails(getDoc(doc(mallory, "consultations/c1")));
    await assertFails(updateDoc(doc(mallory, "consultations/c1"), { userId: "mallory" }));
    await assertFails(getDoc(doc(alice(), "stats/global")));
    await assertFails(getDoc(doc(alice(), "auditLogs/x")));
  });

  it("can't reassign their consultation to someone else", async () => {
    await assertFails(updateDoc(doc(alice(), "consultations/c1"), { userId: "bob" }));
  });
});

describe("admins", () => {
  it("read users, consultations, feedback and stats, but not chat transcripts", async () => {
    await assertSucceeds(getDoc(doc(admin(), "users/alice")));
    await assertSucceeds(getDoc(doc(admin(), "consultations/c1")));
    await assertSucceeds(getDoc(doc(admin(), "feedback/f1")));
    await assertSucceeds(getDoc(doc(admin(), "stats/global")));
    await assertFails(getDoc(doc(admin(), "chatMessages/m1")));
  });

  it("manage the catalog with valid documents only", async () => {
    await assertSucceeds(setDoc(doc(admin(), "haircuts/NEW"), haircut("admin1", { arType: "GLB" })));
    await assertSucceeds(deleteDoc(doc(admin(), "haircuts/NEW")));
    await assertFails(setDoc(doc(admin(), "haircuts/BAD"), haircut("admin1", { length: "BALD" })));
    await assertFails(setDoc(doc(admin(), "haircuts/BAD"), haircut("admin1", { name: "" })));
    await assertFails(setDoc(doc(admin(), "haircuts/BAD"), haircut("someone-else")));
  });

  it("append audit logs as themselves, and can't edit them", async () => {
    const entry = { action: "haircut.update", actorUid: "admin1", at: serverTimestamp() };
    await assertSucceeds(setDoc(doc(admin(), "auditLogs/a1"), entry));
    await assertFails(setDoc(doc(admin(), "auditLogs/a2"), { ...entry, actorUid: "someone-else" }));
    await assertFails(updateDoc(doc(admin(), "auditLogs/a1"), { action: "x" }));
  });

  it("can't write stats directly (Cloud Functions own them)", async () => {
    await assertFails(setDoc(doc(admin(), "stats/global"), { users: { total: 0 } }));
  });
});

describe("storage", () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const storageOf = (uid, claims) => env.authenticatedContext(uid, claims).storage();

  it("lets the app keep uploading its own photos", async () => {
    await assertSucceeds(uploadBytes(ref(storageOf("alice"), "users/alice/consultations/a.jpg"), bytes));
    await assertFails(uploadBytes(ref(storageOf("mallory"), "users/alice/consultations/b.jpg"), bytes));
  });

  it("only lets admins upload versioned catalog assets", async () => {
    const adminStorage = storageOf("admin1", { admin: true });
    await assertSucceeds(
      uploadBytes(ref(adminStorage, "haircuts/X/thumb-1700000000.png"), bytes, { contentType: "image/png" }),
    );
    await assertSucceeds(uploadBytes(ref(adminStorage, "haircuts/X/effect-2.deepar"), bytes));
    await assertSucceeds(uploadBytes(ref(adminStorage, "haircuts/X/model-3.glb"), bytes));
    await assertFails(uploadBytes(ref(adminStorage, "haircuts/X/thumb.png"), bytes, { contentType: "image/png" }));
    await assertFails(uploadBytes(ref(adminStorage, "haircuts/X/thumb-1.png"), bytes, { contentType: "text/html" }));
    await assertFails(uploadBytes(ref(adminStorage, "haircuts/X/payload-1.exe"), bytes));
    await assertFails(uploadBytes(ref(storageOf("alice"), "haircuts/X/model-4.glb"), bytes));
    await assertSucceeds(deleteObject(ref(adminStorage, "haircuts/X/model-3.glb")));
  });
});
