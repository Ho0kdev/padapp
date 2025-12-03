// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Output standalone para Docker (genera archivos optimizados)
  output: 'standalone',

  typescript: {
    // Evita que el build falle por errores de typescript en producción (opcional)
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;

