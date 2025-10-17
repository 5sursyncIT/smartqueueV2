import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    react: {
      // Ignorer les différences d'attributs mineures pendant l'hydratation
      // Utile pour les attributs ajoutés par des extensions navigateur
      ignoreHydrationMismatch: true,
    },
  },
};

export default nextConfig;
