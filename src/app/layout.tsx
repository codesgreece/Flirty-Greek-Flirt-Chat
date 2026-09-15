import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: {
    default: "FLIRTY — Meet. Flirt. Belong.",
    template: "%s · FLIRTY",
  },
  description: "Discover people, find your Vibe, make the first Flirt and create real connections.",
  applicationName: "FLIRTY",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/logo/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png" }],
  },
  openGraph: {
    title: "FLIRTY — Meet. Flirt. Belong.",
    description: "Meet someone worth staying for.",
    images: ["/icons/og.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FLIRTY",
    description: "Meet. Flirt. Belong.",
    images: ["/icons/og.png"],
  },
  appleWebApp: {
    capable: true,
    title: "FLIRTY",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#07040d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className="bg-orbs font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
