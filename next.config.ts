import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off on purpose: every query runs with the signed-in
  // user's session so Postgres row-level security can filter it, which means
  // nothing here is shareable or cacheable across requests. Plain request-time
  // rendering keeps the data flow simple.
  // The dev-only "N" badge sits on top of the sidebar's account menu.
  devIndicators: false,
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
