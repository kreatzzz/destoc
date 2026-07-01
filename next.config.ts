import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Coolify builds on the small Oracle host. A single build worker avoids
    // memory spikes during static-page generation; runtime concurrency is
    // unaffected.
    cpus: 1,
  },
};

export default nextConfig;
