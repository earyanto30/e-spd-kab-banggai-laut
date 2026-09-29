/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          primary: '#1e3a8a', // navy
          secondary: '#334155', // slate
          accent: '#d97706', // amber/gold
          surface: '#f8fafc',
          border: '#e2e8f0',
        },
      },
      spacing: {
        portal: '32rem',
      },
    },
  },
  plugins: [],
};
