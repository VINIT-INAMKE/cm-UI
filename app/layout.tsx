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
  title: {
    default: "Climate Monitor - AI-Powered Environmental Intelligence",
    template: "%s | Climate Monitor"
  },
  description: "Real-time climate monitoring with AI-powered analysis, blockchain verification, and health risk assessments. Track air quality, temperature, humidity, and pollution levels worldwide.",
  keywords: [
    "climate monitoring",
    "air quality",
    "AQI",
    "PM2.5",
    "carbon monoxide",
    "environmental data",
    "blockchain verification",
    "AI analysis",
    "health recommendations",
    "pollution tracking"
  ],
  authors: [{ name: "Climate Monitor Team" }],
  creator: "Climate Monitor",
  publisher: "Climate Monitor",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Climate Monitor - AI-Powered Environmental Intelligence",
    description: "Real-time climate monitoring with AI-powered analysis and blockchain verification",
    siteName: "Climate Monitor",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Climate Monitor Platform"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Climate Monitor - AI-Powered Environmental Intelligence",
    description: "Real-time climate monitoring with AI-powered analysis and blockchain verification",
    images: ["/og-image.png"]
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
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  manifest: "/manifest.json"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
