/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1a1a2e',
          deep: '#0f0f1e',
          soft: '#252540',
        },
        cream: {
          DEFAULT: '#f5f5dc',
          muted: '#d4d4b8',
        },
        gold: {
          DEFAULT: '#c9a84c',
          bright: '#e6c463',
        },
        'gray-line': '#3a3a52',
        signal: {
          red: '#c44545',
          green: '#4a9d6e',
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
