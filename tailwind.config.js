/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Page background — warm paper white
        paper: '#FAF9F6',
        // Primary text and buttons — deep blue-black ink
        ink: {
          DEFAULT: '#1B2733',
          hover: '#2C3B4A',
        },
        // Brand accent — deep pine teal; also the "this day works" color
        pine: {
          50: '#F0F7F4',
          100: '#DEEDE8',
          200: '#B9DACF',
          500: '#2A7F71',
          600: '#1D6A5F',
          700: '#17564D',
          800: '#124540',
        },
        // Elimination — muted red pencil
        cut: {
          50: '#FAF0EF',
          100: '#F4DEDC',
          200: '#E7C0BD',
          500: '#B4423A',
          600: '#A03830',
          700: '#8A2F29',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(27, 39, 51, 0.05)',
        raised: '0 1px 3px rgba(27, 39, 51, 0.06), 0 8px 24px rgba(27, 39, 51, 0.07)',
      },
    },
  },
  plugins: [],
}
