import type { NextConfig } from 'next';

const supabaseHostname = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pxhdbjctgnaarijmkmfq.supabase.co',
).hostname;

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: supabaseHostname, pathname: '/storage/v1/object/**' }],
  },
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev'],
};

export default nextConfig;
