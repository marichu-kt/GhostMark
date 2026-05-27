import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#111417",
          900: "#171b20",
          850: "#1d2228",
          800: "#242a31",
          700: "#343c46",
          600: "#4b5563",
        },
        steel: {
          100: "#dfe5ea",
          200: "#c6d0d8",
          300: "#9facb8",
          500: "#66727f",
        },
        document: {
          50: "#f7f5ef",
          100: "#eee9df",
          200: "#ddd5c8",
        },
        amberline: {
          100: "#f2dfb5",
          300: "#c39a4b",
          700: "#71551f",
        },
        local: {
          100: "#d8eadf",
          500: "#5f9c75",
          700: "#326044",
        },
        danger: {
          100: "#f1d7d6",
          500: "#b95c59",
          700: "#7d3432",
        },
        brand: {
          red: "#c62828",
          ink: "#111417",
          paper: "#f8f7f2",
          graphite: "#191d22",
          steel: "#7a8793",
        },
      },
      boxShadow: {
        panel: "0 12px 30px rgba(0, 0, 0, 0.18)",
      },
      fontFamily: {
        sans: [
          "InterVariable",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
