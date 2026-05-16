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
          50:  '#f0f7ff',
          100: '#e0eefe',
          200: '#bbdcfd',
          300: '#7ec0fc',
          400: '#3aa0f7',
          500: '#1183ec',
          600: '#0566c9',
          700: '#0552a3',
          800: '#094687',
          900: '#0d3c70',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
