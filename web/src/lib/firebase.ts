"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

if (!useEmulators && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  throw new Error(
    "Missing Firebase web config: copy web/.env.example to web/.env.local and fill it in " +
      "(or set NEXT_PUBLIC_USE_EMULATORS=true to run against the local emulators).",
  );
}

const app =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || (useEmulators ? "demo-key" : undefined),
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || (useEmulators ? "demo-hairconsultant" : undefined),
        storageBucket:
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
          (useEmulators ? "demo-hairconsultant.appspot.com" : undefined),
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, process.env.NEXT_PUBLIC_FUNCTIONS_REGION || "asia-southeast1");

const globalFlag = globalThis as { __hcEmulatorsConnected?: boolean };
if (useEmulators && !globalFlag.__hcEmulatorsConnected) {
  globalFlag.__hcEmulatorsConnected = true;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
