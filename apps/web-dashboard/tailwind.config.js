/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#1F4B99",
        ink: "#101418",
        surface: "#F5F6F8",
        border: "#E2E5EA",
        bloquant: "#DC2626",
        majeur: "#F59E0B",
        mineur: "#6B7280",
        success: "#16A34A",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
