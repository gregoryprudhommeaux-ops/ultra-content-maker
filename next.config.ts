import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@ns-suite/ui"],
  serverExternalPackages: ["firebase", "firebase-admin", "@grpc/grpc-js", "@grpc/proto-loader"],
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" };
      config.watchOptions = {
        pollIntervalMs: 1000,
        aggregateTimeout: 600,
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
