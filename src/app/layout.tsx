import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Landshark Triathlon Club",
  description: "Club activity leaderboard and kudos, powered by Strava.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/favicon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Landshark",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ea580c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        {/* Chrome and Edge fire this once, possibly before React loads; keep it so "Install app" can use it later. */}
        <Script id="capture-install-prompt" strategy="beforeInteractive">
          {`window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__installPrompt=e;window.dispatchEvent(new Event("installpromptready"))});`}
        </Script>
        {children}
      </body>
    </html>
  );
}
