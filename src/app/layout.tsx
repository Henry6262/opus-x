import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Font configurations
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const siteUrl = "https://superrouter.fun";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SuperRouter | AI Trading Intelligence",
    template: "%s | SuperRouter",
  },
  description:
    "Real-time AI trading intelligence for Solana tokens. Track pump.fun migrations, Twitter sentiment, and market signals. Watch the Vibr Coder work.",
  keywords: [
    "Solana",
    "trading",
    "AI",
    "pump.fun",
    "tokens",
    "crypto",
    "DeFi",
    "migration",
    "Twitter",
    "sentiment",
  ],
  authors: [{ name: "SuperRouter" }],
  creator: "SuperRouter",
  publisher: "SuperRouter",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/android-chrome-192x192.png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/android-chrome-512x512.png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "SuperRouter",
    title: "SuperRouter | AI Trading Intelligence",
    description:
      "Real-time AI trading intelligence for Solana tokens. Track pump.fun migrations, Twitter sentiment, and market signals.",
    images: [
      {
        url: "/assets/x-banner.jpg",
        width: 1200,
        height: 630,
        alt: "SuperRouter - AI Trading Intelligence",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SuperRouter | AI Trading Intelligence",
    description:
      "Real-time AI trading intelligence for Solana tokens. Track pump.fun migrations, Twitter sentiment, and market signals.",
    images: ["/assets/x-banner.jpg"],
    creator: "@superrouter",
    site: "@superrouter",
  },
};

export const viewport: Viewport = {
  themeColor: "#68ac6e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
