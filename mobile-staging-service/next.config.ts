import type { NextConfig } from 'next';
import { resolve } from 'node:path';

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Izolace od nadrazeneho weboveho projektu.
  turbopack: {
    root: resolve(process.cwd()),
  },
};

export default nextConfig;
