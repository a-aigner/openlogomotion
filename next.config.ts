import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler"],
  turbopack: {},
  webpack: (config) => {
    config.externals = [...(config.externals || []), { "@remotion/renderer": "commonjs @remotion/renderer" }];
    return config;
  },
};
export default nextConfig;
