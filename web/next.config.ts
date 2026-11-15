import type { NextConfig } from "next";

// UI preview mode: swap the Firebase SDK for empty in-memory fakes (src/preview/) and sign in
// automatically, so the dashboard runs with just `npm run dev` and no Firebase project or emulators.
const preview = process.env.NEXT_PUBLIC_PREVIEW_MODE === "true";
const previewAliases = {
  "firebase/app": "./src/preview/app.ts",
  "firebase/auth": "./src/preview/auth.ts",
  "firebase/firestore": "./src/preview/firestore.ts",
  "firebase/functions": "./src/preview/functions.ts",
  "firebase/storage": "./src/preview/storage.ts",
};

// Static export: the dashboard is a client-side app that talks to Firebase directly, so it's
// deployed as plain files on Firebase Hosting (see ../firebase.json "hosting").
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  turbopack: {
    resolveAlias: preview ? previewAliases : {},
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
