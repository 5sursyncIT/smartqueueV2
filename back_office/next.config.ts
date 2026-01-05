import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Désactiver la minimisation en développement pour éviter les problèmes de chunks
  webpack: (config, { dev }) => {
    if (dev) {
      config.optimization.minimize = false;
    }
    return config;
  },
  // Éviter les erreurs de hydratation
  experimental: {
    // Désactiver le préchargement automatique en développement
    optimizeCss: false,
  },
};

export default nextConfig;
