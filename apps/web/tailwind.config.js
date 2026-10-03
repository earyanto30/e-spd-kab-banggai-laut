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
        primary: 'var(--color-primary)',
        canvas: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'text-main': 'var(--color-text-primary)',
        'text-muted': 'var(--color-text-muted)',
        accent: 'var(--color-accent)',
        success: 'var(--color-success)',
        border: 'var(--color-border)',
        gov: {
          primary: 'var(--color-primary)',
          secondary: 'var(--color-text-muted)',
          accent: 'var(--color-accent)',
          surface: 'var(--color-surface)',
          canvas: 'var(--color-bg)',
          border: 'var(--color-border)',
        },
      },
      spacing: {
        portal: '32rem',
      },
    },
  },
  plugins: [],
};
