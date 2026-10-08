/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fbf5ff',
          100: '#f5e8ff',
          200: '#edd4fe',
          300: '#deb2fd',
          400: '#c784fa',
          500: '#ae55f4',
          600: '#942fe6',
          700: '#7e22ce', // Primary purple
          800: '#671ca7',
          900: '#531b84',
          950: '#380a5e',
        },
        burgundy: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d', // Burgundy secondary
          900: '#831843',
          950: '#500727',
        }
      }
    },
  },
  plugins: [],
}
