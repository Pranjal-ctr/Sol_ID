/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3e8ff",
          100: "#e9d5ff",
          200: "#d8b4fe",
          300: "#c084fc",
          400: "#a855f7",
          500: "#9333ea",
          600: "#7e22ce",
          700: "#6b21a8",
          800: "#581c87",
          900: "#3b0764",
        },
        surface: {
          DEFAULT: "#09090b",
          50: "#131316",
          100: "#18181b",
          200: "#1c1c22",
          300: "#232329",
          400: "#2a2a32",
        },
        trust: {
          verified: "#34d399",
          score: "#22d3ee",
          pending: "#fbbf24",
          rejected: "#f87171",
          elite: "#a78bfa",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, #7c3aed 0%, #3b82f6 50%, #06b6d4 100%)",
        "gradient-trust":
          "linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #22d3ee 100%)",
        "gradient-card":
          "linear-gradient(180deg, rgba(24,24,27,0.8) 0%, rgba(9,9,11,0.95) 100%)",
        "gradient-subtle":
          "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(124, 58, 237, 0.25)",
        "glow-sm": "0 0 10px rgba(124, 58, 237, 0.15)",
        "glow-lg": "0 0 40px rgba(124, 58, 237, 0.3)",
        card: "0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.4), 0 16px 40px rgba(0,0,0,0.3)",
        trust: "0 0 0 1px rgba(124,58,237,0.1), 0 8px 24px rgba(0,0,0,0.3)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "trust-pulse": "trust-pulse 3s ease-in-out infinite",
        "identity-glow": "identity-glow 4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "slide-up": "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.4s ease-out",
        "slide-in-left": "slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        orbit: "orbit 20s linear infinite",
        "orbit-reverse": "orbit 25s linear infinite reverse",
      },
      keyframes: {
        "trust-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(124, 58, 237, 0)" },
          "50%": { boxShadow: "0 0 0 6px rgba(124, 58, 237, 0.08)" },
        },
        "identity-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        orbit: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [],
};
