import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Off: store pages and counters must always show fresh data
  cacheComponents: false,
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