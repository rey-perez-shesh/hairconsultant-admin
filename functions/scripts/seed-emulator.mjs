// Fills the local Firebase emulators with sample data for trying the dashboard.
// Usage (emulators running): npm run seed:emulator   — never point this at production.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= "127.0.0.1:9199";

const projectId = process.env.GCLOUD_PROJECT ?? "demo-hairconsultant";
if (!projectId.startsWith("demo-")) throw new Error("Refusing to seed a non-demo project.");
initializeApp({ projectId });
const auth = getAuth();
const db = getFirestore();

const DAY = 86_400_000;
const now = Date.now();
const pick = (items, i) => items[i % items.length];

async function upsertUser(email, password, displayName, claims) {
  const user = await auth.getUserByEmail(email).catch(() => auth.createUser({ email, password, displayName, emailVerified: true }));
  if (claims) await auth.setCustomUserClaims(user.uid, claims);
  return user.uid;
}

// Admin who can sign in to the dashboard.
const adminUid = await upsertUser("admin@demo.test", "password123", "Demo Admin", { admin: true });
await db.doc("config/admins").set({ members: { [adminUid]: { email: "admin@demo.test", grantedBy: "seed" } } });

// Styles exactly as the old app mirrored SampleData (no isActive/sortOrder/arType yet).
const drawable = (name) => `android.resource://com.hairconsultant.app/drawable/${name}`;
const haircuts = [
  ["SHORT_STRAIGHT_0", "Boy Cut", "SHORT", "STRAIGHT", ["ROUND", "OVAL"], "MASCULINE", "thumb_buzz_cut"],
  ["SHORT_STRAIGHT_1", "Curtains", "SHORT", "STRAIGHT", ["OVAL", "SQUARE", "HEART"], "UNISEX", "thumb_curtains"],
  ["SHORT_STRAIGHT_9", "French Crop", "SHORT", "STRAIGHT", ["OVAL", "ROUND"], "MASCULINE", "thumb_french_crop"],
  ["SHORT_WAVY_4", "Wavy Fringe Crop", "SHORT", "WAVY", ["OVAL", "SQUARE"], "UNISEX", "thumb_wavy_pixie"],
  ["MEDIUM_STRAIGHT_4", "Face Framing Layered Cut", "MEDIUM", "STRAIGHT", ["ROUND", "SQUARE", "HEART"], "FEMININE", "thumb_medium_layered"],
  ["MEDIUM_CURLY_1", "Layered Curly Shag", "MEDIUM", "CURLY", ["OVAL", "DIAMOND"], "UNISEX", "thumb_short_feathered_shag"],
  ["LONG_WAVY_1", "Long Wavy Hair", "LONG", "WAVY", ["OVAL", "HEART", "DIAMOND"], "FEMININE", "thumb_long_wavy"],
  ["LONG_WAVY_7", "Shaggy Wolfcut", "LONG", "WAVY", ["OVAL", "SQUARE"], "UNISEX", "thumb_shaggy_wolfcut"],
];
for (const [id, name, length, texture, shapes, genderStyle, thumb] of haircuts) {
  await db.doc(`haircuts/${id}`).set({
    name,
    imageUrl: drawable(thumb),
    length,
    texture,
    recommendedFaceShapes: shapes,
    genderStyle,
    treatment: "NONE",
    description: `${name} balances ${shapes.map((s) => s.toLowerCase()).join(", ")} face shapes.`,
  });
}

// App users with consultations and reviews spread over the last month.
const genders = ["MALE", "FEMALE", "MALE", "NON_BINARY", "FEMALE", "MALE"];
const shapes = ["OVAL", "ROUND", "SQUARE", "HEART", "OVAL", "DIAMOND"];
const comments = [
  "Love the curtains try-on, looked exactly like me!",
  "Face scan said round but I think I'm oval.",
  "AI stylist gave good advice for my wavy hair.",
  "",
  "Try-on lags a bit on my phone.",
  "Found my next haircut, thanks!",
];
for (let u = 0; u < 6; u++) {
  const email = `user${u + 1}@demo.test`;
  const uid = await upsertUser(email, "password123", `User ${u + 1}`);
  const joined = now - (28 - u * 4) * DAY;
  await db.doc(`users/${uid}`).set({
    email,
    username: `stylefan${u + 1}`,
    birthdayEpochDay: 11000 + u * 300,
    gender: genders[u],
    photoUrl: null,
    createdAtEpochMillis: joined,
    lastActiveAtEpochMillis: now - u * DAY,
    preferredHairLength: pick(["SHORT", "MEDIUM", "LONG"], u),
    preferredHairTexture: pick(["STRAIGHT", "WAVY", "CURLY"], u),
    preferredTreatment: "NONE",
  });
  for (let c = 0; c < 3 + u; c++) {
    const haircut = pick(haircuts, u + c);
    const conf = 0.55 + ((u * 7 + c * 3) % 40) / 100;
    await db.collection("consultations").add({
      userId: uid,
      source: c % 3 === 0 ? "IMAGE_UPLOAD" : "FACE_SCAN",
      faceShape: shapes[u],
      hairLength: pick(["SHORT", "MEDIUM", "LONG"], u + c),
      hairTexture: pick(["STRAIGHT", "WAVY", "CURLY"], c),
      selectedHaircutId: c % 2 === 0 ? haircut[0] : null,
      sourceImageUrl: null,
      resultImageUrl: null,
      isFavorite: c % 3 === 1,
      createdAtEpochMillis: now - ((u * 5 + c * 2) % 29) * DAY - c * 3_600_000,
      hairColor: "BLACK",
      faceShapeConfidence: conf,
      hairLengthConfidence: conf - 0.05,
      hairTextureConfidence: conf + 0.03,
      verifierFaceShape: c % 4 === 3 ? "OVAL" : shapes[u],
      sourcesAgreed: c % 4 !== 3,
      appVersion: "1.0",
      deviceModel: "Xiaomi 2201117TG",
    });
  }
  await db.collection("feedback").add({
    userId: uid,
    rating: [5, 3, 4, 5, 2, 5][u],
    comment: comments[u],
    createdAtEpochMillis: now - u * 3 * DAY,
  });
}

console.log("Seeded. Dashboard login: admin@demo.test / password123");
process.exit(0);
