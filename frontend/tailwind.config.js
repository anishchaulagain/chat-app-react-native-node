/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6C63FF',
        secondary: '#2D2B55',
        dark: '#1A1A2E',
        accent: '#E94560',
        surface: '#16213E',
        muted: '#8B8FAE',
      }
    },
  },
  plugins: [],
}
