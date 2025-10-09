// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // Evita que el build falle por errores de ESLint (útil para despliegues en Dokploy, Vercel, etc.)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Evita que el build falle por errores de typescript en producción (opcional)
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;

