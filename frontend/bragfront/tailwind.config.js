/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#051d2dff',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // Sky 500
          600: '#0284c7', // Sky 600
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          primary: '#22d3ee', // Bright Cyan - highly visible
          secondary: '#f472b6', // Bright Pink - pops on dark backgrounds
          accent: '#a78bfa', // Purple accent
          dark: '#1e1b4b', // Indigo 950 (Deep Purple)
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
