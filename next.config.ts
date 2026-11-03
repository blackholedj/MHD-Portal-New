import type { NextConfig } from 'next';

const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseHostname = configuredSupabaseUrl
  ? new URL(configuredSupabaseUrl).hostname
  : null;

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: supabaseHostname
      ? [{
          protocol: 'https',
          hostname: supabaseHostname,
          pathname: '/storage/v1/object/**',
        }]
      : [],
  },
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev'],
};

export default nextConfig;
