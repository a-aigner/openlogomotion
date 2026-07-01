import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals = [...(config.externals || []), { "@remotion/renderer": "commonjs @remotion/renderer" }];
    return config;
  },
};
export default nextConfig;
