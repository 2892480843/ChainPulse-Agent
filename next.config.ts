import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingExcludes: {
    "/api/agent/run": ["./**/*"],
    "/api/reports": ["./**/*"],
    "/api/reports/[id]": ["./**/*"],
    "/api/tasks": ["./**/*"],
    "/api/tasks/[id]": ["./**/*"],
    "/api/traces": ["./**/*"]
  }
};

export default nextConfig;
