import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

module.exports = {
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev'],
  images: {
    remotePatterns: [new URL('https://abfuprplwnftsvichild.supabase.co/storage/v1/object/public/**')],
  },

};

export default nextConfig;
