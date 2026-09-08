import type { Metadata, Viewport } from "next";
import { Anton, Oswald, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { createServerSupabase } from "@/lib/supabase/server";
import { EventSettings } from "@/lib/types";
import SplashScreen from "@/components/SplashScreen";

const anton = Anton({ subsets: ["latin"], weight: ["400"], variable: "--font-anton", display: "swap" });
const oswald = Oswald({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-oswald", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "SCE Picks | Call Your Shot",
  description: "Make your picks for YoungKnights vs AlumKnights. Hit your card and win real prizes. Free to play.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "SCE Picks | Call Your Shot",
    description: "Make your picks for YoungKnights vs AlumKnights. Hit your card and win real prizes. Free to play.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "SCE Picks — Make Your Picks, Win Real Prizes",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SCE Picks | Call Your Shot",
    description: "Make your picks. Hit your card. Win real prizes. Free to play.",
    images: ["/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#050506",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let youngLogoUrl: string | null = null;
  let alumLogoUrl: string | null = null;

  try {
    const supabase = createServerSupabase();
    const { data } = await supabase.from("event_settings").select("young_logo_url, alum_logo_url").eq("id", 1).single();
    const settings = data as Pick<EventSettings, "young_logo_url" | "alum_logo_url"> | null;
    youngLogoUrl = settings?.young_logo_url ?? null;
    alumLogoUrl = settings?.alum_logo_url ?? null;
  } catch {}

  return (
    <html lang="en" className={`${anton.variable} ${oswald.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="font-body antialiased bg-ink text-bone">
        <SplashScreen youngLogoUrl={youngLogoUrl} alumLogoUrl={alumLogoUrl}>
          {children}
        </SplashScreen>
      </body>
    </html>
  );
}
