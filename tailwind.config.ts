import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        warm: {
          50: "#FAF7F2",
          100: "#F5EFE6",
          200: "#EADCC9",
          300: "#DFC8AB",
          400: "#C9A77F",
          500: "#B38654",
          600: "#8F673C",
          700: "#6B4B2A",
          800: "#4A331C",
          900: "#2B1D0F",
        },
        rose: {
          50: "#FFF5F5",
          100: "#FFE3E3",
          200: "#FFC9C9",
          300: "#FFA8A8",
          400: "#FA5252",
          500: "#E03131",
          600: "#C92A2A",
        },
        amber: {
          50: "#FFF9DB",
          100: "#FFF3BF",
          200: "#FFE066",
          300: "#FFD43B",
          400: "#FCC419",
          500: "#FAB005",
          600: "#F59F00",
        },
        emerald: {
          50: "#EBFBEE",
          100: "#D3F9D8",
          200: "#B2F2BB",
          300: "#8CE99A",
          400: "#51CF66",
          500: "#37B24D",
          600: "#2F9E44",
        },
        indigo: {
          50: "#EDF2FF",
          100: "#DBE4FF",
          200: "#BAC8FF",
          300: "#91A7FF",
          400: "#748FFC",
          500: "#4C6EF5",
          600: "#3B5BDB",
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        'soft-sm': '0 2px 8px 0 rgba(0, 0, 0, 0.04)',
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 12px 32px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      borderRadius: {
        'ios': '1.25rem',
        'ios-lg': '1.5rem',
        'ios-xl': '2rem',
      }
    },
  },
  plugins: [],
};
export default config;
