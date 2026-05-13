import type { Config } from "tailwindcss";

// Telegram-aware design tokens. Most colors derive from Telegram CSS vars so
// the app inherits the user's Telegram theme automatically (light / dark).
// The hex fallbacks let us preview the app outside Telegram (npm run dev).

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        sm: "100%",
        md: "640px",
        lg: "768px",
      },
    },
    extend: {
      colors: {
        bg: "var(--tg-bg, #0f1115)",
        surface: "var(--tg-surface, #1a1d24)",
        elevated: "var(--tg-elevated, #232730)",
        border: "var(--tg-border, #2d3340)",
        text: "var(--tg-text, #e8edf6)",
        muted: "var(--tg-muted, #8c95a8)",
        link: "var(--tg-link, #4fc3f7)",
        primary: "var(--tg-primary, #4fc3f7)",
        "primary-fg": "var(--tg-primary-fg, #06121b)",
        success: "#3ddc97",
        warning: "#ffb84f",
        danger: "#ff6679",
        accent: "#a78bfa",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      fontFamily: {
        sans: ["var(--font-tg, ui-sans-serif)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono, ui-monospace)", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { transform: "translateY(12px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        pulseSoft: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.7" } },
        shimmer: {
          from: { backgroundPosition: "-400px 0" },
          to: { backgroundPosition: "400px 0" },
        },
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 6px 24px rgba(0,0,0,0.32)",
        glow: "0 0 0 1px rgba(79,195,247,0.5), 0 0 24px rgba(79,195,247,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
