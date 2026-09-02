import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#050506",
        ink2: "#0B0B0D",
        panel: "#111114",
        panelLight: "#1A1A1F",
        line: "#26262C",
        lineBright: "#38383F",
        bone: "#F5F4F1",
        boneDim: "#B8B7B4",
        young: {
          DEFAULT: "#EA2A2A",
          dark: "#8C1414",
          light: "#FF5A4E",
          glow: "rgba(234,42,42,0.35)",
        },
        alum: {
          DEFAULT: "#1E5FFF",
          dark: "#0E2E8C",
          light: "#5C8AFF",
          glow: "rgba(30,95,255,0.35)",
        },
      },
      fontFamily: {
        display: ["var(--font-anton)", "sans-serif"],
        head: ["var(--font-oswald)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      backgroundImage: {
        "grain": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
        "hero-glow": "radial-gradient(120% 90% at 15% 0%, rgba(234,42,42,0.35) 0%, rgba(234,42,42,0) 45%), radial-gradient(120% 90% at 85% 100%, rgba(30,95,255,0.35) 0%, rgba(30,95,255,0) 45%)",
      },
      boxShadow: {
        glowRed: "0 0 40px -8px rgba(234,42,42,0.45)",
        glowBlue: "0 0 40px -8px rgba(30,95,255,0.45)",
        card: "0 12px 30px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        pop: "pop 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        shimmer: "shimmer 2.5s linear infinite",
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
