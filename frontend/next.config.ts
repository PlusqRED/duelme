import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  agentRules: false,
  // The landing's note from the developer says when the site was last updated: this build.
  env: {
    DUELME_BUILT_AT: new Date().toISOString(),
  },
};

export default nextConfig;
