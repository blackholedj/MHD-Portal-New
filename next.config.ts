// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Přidáme images a allowedDevOrigins sem, aby byly v rámci jednoho exportu
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'abfuprplwnftsvichild.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  
  // Toto je spíše pro HMR v Next.js 14+, ale ponecháme
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev'],
};

export default nextConfig;


// stara verze 
// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
//   reactCompiler: true,
// };

// module.exports = {
//   allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev'],
//   images: {
//     remotePatterns: [new URL('https://abfuprplwnftsvichild.supabase.co/storage/v1/object/public/**')],
//   },

// };

// export default nextConfig;
