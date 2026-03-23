import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_NAKAMA_HOST: process.env.NEXT_PUBLIC_NAKAMA_HOST || "localhost",
    NEXT_PUBLIC_NAKAMA_PORT: process.env.NEXT_PUBLIC_NAKAMA_PORT || "7350",
    NEXT_PUBLIC_NAKAMA_USE_SSL: process.env.NEXT_PUBLIC_NAKAMA_USE_SSL || "false",
    NEXT_PUBLIC_NAKAMA_KEY: process.env.NEXT_PUBLIC_NAKAMA_KEY || "defaultkey",
  },
};

export default nextConfig;
