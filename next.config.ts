import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "xlsx-populate"],
};

export default nextConfig;
