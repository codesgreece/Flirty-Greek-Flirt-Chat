import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07040d",
          900: "#0c0716",
          800: "#140c24",
          700: "#1d1233",
        },
        flirty: {
          pink: "#ff3d8a",
          magenta: "#e11d74",
          orchid: "#c026d3",
          indigo: "#4338ca",
          deep: "#1e1b4b",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-plus-jakarta)", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(255, 61, 138, 0.25)",
        card: "0 18px 50px rgba(0, 0, 0, 0.45)",
      },
      borderRadius: {
        xl2: "1.5rem",
        xl3: "2rem",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(-10px)" },
          "50%": { transform: "translateY(10px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "0.9" },
        },
        gradientShift: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      animation: {
        floaty: "floaty 7s ease-in-out infinite",
        "floaty-slow": "floaty 9s ease-in-out infinite",
        "floaty-delayed": "floaty 8s ease-in-out 1.4s infinite",
        "pulse-glow": "pulseGlow 3.2s ease-in-out infinite",
        "gradient-shift": "gradientShift 18s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;
