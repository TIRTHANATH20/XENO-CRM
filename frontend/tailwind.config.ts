import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        coffee: {
          cream: "#DCE9F0",
          tan: "#7CA5B5",
          dark: "#0C1821",
          accent: "#2E6E7D",
          muted: "#72879A",
          surface: "#21354A",
          panel: "#263E55",
          border: "#3A5C73",
          highlight: "#2E6E7D",
          highlightStrong: "#4B8291",
          text: "#E7F2F8",
          success: "#5A8778",
        },
        surface: {
          DEFAULT: "#121B25",
          card: "#1B2C3C",
          elevated: "#203549",
          border: "#36526A",
        },
      },
      boxShadow: {
        soft: "0 20px 60px rgba(0,0,0,0.18)",
      },
      backgroundImage: {
        "coffee-gradient": "radial-gradient(circle at top, rgba(56,112,125,0.12), transparent 32%), linear-gradient(180deg, #101B26 0%, #0C1821 100%)",
      },
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        pulseSoft: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.6" } },
      },
    },
  },
  plugins: [],
};

export default config;
