import type { Metadata, Viewport } from "next";
import { Anton, Oswald, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { createServerSupabase } from "@/lib/supabase/server";
import { EventSettings } from "@/lib/types";
import SplashScreen from "@/components/SplashScreen";

const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-anton",
  display: "swap",
});

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

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SCE Picks | Call Your Shot",
  description:
    "Make your picks for YoungKnights vs AlumKnights. Hit your card and win real prizes. Free to play.",
  openGraph: {
    title: "SCE Picks | Call Your Shot",
    description:
      "Make your picks for YoungKnights vs AlumKnights. Hit your card and win real prizes. Free to play.",
    images: ["/og-image.jpg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SCE Picks | Call Your Shot",
    description:
      "Make your picks. Hit your card. Win real prizes. Free to play.",
    images: ["/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#050506",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Best-effort fetch, if this fails the splash just falls back
  // to the text wordmark treatment instead of real logos.
  let youngLogoUrl: string | null = null;
  let alumLogoUrl: string | null = null;

  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from("event_settings")
      .select("young_logo_url, alum_logo_url")
      .eq("id", 1)
      .single();

    const settings = data as Pick<
      EventSettings,
      "young_logo_url" | "alum_logo_url"
    > | null;

    youngLogoUrl = settings?.young_logo_url ?? null;
    alumLogoUrl = settings?.alum_logo_url ?? null;
  } catch {
    // Ignore -- splash falls back to text wordmarks.
  }

  return (
    <html
      lang="en"
      className={`${anton.variable} ${oswald.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body className="font-body antialiased bg-ink text-bone">
        <SplashScreen
          youngLogoUrl={youngLogoUrl}
          alumLogoUrl={alumLogoUrl}
        >
          {children}
        </SplashScreen>
      </body>
    </html>
  );
}
