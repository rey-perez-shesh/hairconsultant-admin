import type { NextConfig } from "next";

// Static export: the dashboard is a client-side app that talks to Firebase directly, so it's
// deployed as plain files on Firebase Hosting (see ../firebase.json "hosting").
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
