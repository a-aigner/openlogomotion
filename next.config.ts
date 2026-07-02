import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler"],
  devIndicators: false, // hide the dev-mode Next.js logo indicator (dev-only; never shows in production)
  turbopack: {},
  webpack: (config) => {
    config.externals = [...(config.externals || []), { "@remotion/renderer": "commonjs @remotion/renderer" }];
    return config;
  },
};
export default nextConfig;
