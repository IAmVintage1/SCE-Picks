import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0C",
        panel: "#151519",
        panelLight: "#1E1F25",
        line: "#2A2B32",
        bone: "#F4F3F0",
        young: {
          DEFAULT: "#E23428",
          dark: "#A8231A",
          light: "#FF6B5C",
        },
        alum: {
          DEFAULT: "#1E4FE0",
          dark: "#12309C",
          light: "#5B84FF",
        },
      },
      fontFamily: {
        display: ["var(--font-oswald)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      backgroundImage: {
        "vs-split":
          "linear-gradient(135deg, #E23428 0%, #E23428 49.5%, #0A0A0C 49.5%, #0A0A0C 50.5%, #1E4FE0 50.5%, #1E4FE0 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
