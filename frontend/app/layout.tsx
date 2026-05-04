import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { BetaBanner } from "@/components/beta-banner";
import { PWAInstallBanner } from "@/components/pwa-install-banner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SyncWalk — Synchronized Group Audio Tours",
  description:
    "Explore Ukrainian cities together with synchronized audio tours. Walk as a group, listen in sync, discover history.",
  generator: "v0.app",
  manifest: "/manifest.json",
  keywords: [
    "audio tour",
    "Kyiv",
    "Kharkiv",
    "Ukraine",
    "group tour",
    "travel",
  ],
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A1A2E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <BetaBanner />
        <PWAInstallBanner />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1A1A2E",
              color: "#ffffff",
              border: "1px solid #2a2a4a",
              borderRadius: "12px",
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
