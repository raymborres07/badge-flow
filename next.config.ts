import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  /* webpack: (config) => {
    config.resolve.symlinks = false;
    config.cache = false;
    return config;
  }, */
};

export default nextConfig;
