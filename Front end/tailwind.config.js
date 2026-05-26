/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
      },
      colors: {
        ink: '#0d1117',
        accent: {
          DEFAULT: '#2563eb',
          light: '#eff6ff',
          ring: 'rgba(37,99,235,0.18)',
        },
      },
      borderRadius: {
        card: '20px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)',
      },
      animation: {
        fadeUp: 'fadeUp 0.45s ease both',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
