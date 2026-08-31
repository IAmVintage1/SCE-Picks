import type { Metadata, Viewport } from "next";
import { Oswald, Inter } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SCE Picks | Call Your Shot",
  description:
    "Free-to-play predictions for YoungKnights vs AlumKnights, October 9 at UCF. Pick OVER or UNDER on player stats. No entry fees, no wagering.",
  openGraph: {
    title: "SCE Picks | Call Your Shot",
    description:
      "YoungKnights vs AlumKnights — October 9 at UCF. Make your free predictions.",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SCE Picks | Call Your Shot",
    description: "YoungKnights vs AlumKnights — October 9 at UCF.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0A0A0C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${oswald.variable} ${inter.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
