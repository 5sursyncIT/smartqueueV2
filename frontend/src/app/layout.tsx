import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartQueue - Solution de Gestion de Files d'Attente Intelligente | Sénégal",
  description: "Solution SaaS innovante de gestion de files d'attente pour entreprises sénégalaises. Réduisez les temps d'attente de 65% avec notre plateforme made in Africa.",
  keywords: "files d'attente, gestion de clients, SaaS, Sénégal, Dakar, entreprise, solution digitale, Africa",
  authors: [{ name: "SmartQueue Team", url: "https://smartqueue.sn" }],
  creator: "SmartQueue",
  publisher: "SmartQueue",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://smartqueue.sn'),
  alternates: {
    canonical: '/',
    languages: {
      'fr-SN': '/',
    },
  },
  openGraph: {
    title: "SmartQueue - Solution de Gestion de Files d'Attente Intelligente | Sénégal",
    description: "Réinventez l'expérience d'attente de vos clients avec notre solution made in Africa",
    url: 'https://smartqueue.sn',
    siteName: 'SmartQueue',
    locale: 'fr_SN',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SmartQueue - Gestion de files d\'attente intelligente',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "SmartQueue - Solution de Gestion de Files d'Attente | Sénégal",
    description: "Solution innovante pour entreprises africaines",
    creator: '@smartqueue_sn',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
