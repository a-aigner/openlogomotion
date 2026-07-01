import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.externals = [...(config.externals || []), { "@remotion/renderer": "commonjs @remotion/renderer" }];
    return config;
  },
};
export default nextConfig;
