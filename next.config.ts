import os from "node:os";
import type { NextConfig } from "next";

// Every IPv4 address of this machine, so a phone on any Wi-Fi subnet can load dev assets.
const lanIps = Object.values(os.networkInterfaces())
  .flat()
  .filter((a) => a?.family === "IPv4" && !a.internal)
  .map((a) => a!.address);

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  // Let phones on the local network load dev assets / HMR.
  allowedDevOrigins: ["*.local", ...lanIps],
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
