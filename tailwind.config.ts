import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6C3CF0",
          dark: "#4A27B5",
          light: "#9C7CFC"
        }
      }
    }
  },
  plugins: []
};

export default config;
