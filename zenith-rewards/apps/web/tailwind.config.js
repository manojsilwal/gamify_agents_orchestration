/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0F1E',
        surface: '#111827',
        primary: '#F5C842',
        textPrimary: '#E8E6E1',
        textSecondary: '#8B8A87',
      },
      fontFamily: {
        instrument: ['Instrument Serif', 'serif'],
        mono: ['DM Mono', 'monospace'],
        geist: ['Geist', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
