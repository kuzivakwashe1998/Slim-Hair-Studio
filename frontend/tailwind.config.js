/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        gold: "#D4AF37",
      },
      fontFamily: { serif: ['"Playfair Display"', "Georgia", "serif"], sans: ["Inter", "system-ui", "sans-serif"] },
      keyframes: {
        lineGrow: { "0%": { transform: "scaleX(0)" }, "100%": { transform: "scaleX(1)" } },
        fadeUp: { "0%": { opacity: 0, transform: "translateY(16px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        pop: { "0%": { opacity: 0, transform: "scale(.92)" }, "100%": { opacity: 1, transform: "scale(1)" } },
      },
      animation: {
        lineGrow: "lineGrow 1.2s cubic-bezier(.22,1,.36,1) forwards",
        fadeUp: "fadeUp .9s cubic-bezier(.22,1,.36,1) both",
        shimmer: "shimmer 3s linear infinite",
        pop: "pop .4s cubic-bezier(.22,1,.36,1) both",
      },
    },
  },
  plugins: [],
};
