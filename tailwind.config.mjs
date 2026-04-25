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
        // Modern palette — used by /v2-* preview pages.
        // Promoted to default if/when the redesign direction lands.
        ink: {
          DEFAULT: '#0a0a0f',
          elevated: '#13131a',
          border: '#1e1e2a',
        },
        paper: {
          DEFAULT: '#f5f5f0',
          dim: '#a8a8a0',
        },
        electric: {
          DEFAULT: '#3b82f6',
          bright: '#60a5fa',
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
        modern: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'mesh-drift': 'mesh-drift 24s ease-in-out infinite',
        'fade-up': 'fade-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) both',
        'ticker': 'ticker 40s linear infinite',
      },
      keyframes: {
        'mesh-drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(8%, -6%) scale(1.1)' },
          '66%': { transform: 'translate(-6%, 8%) scale(0.95)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'ticker': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};
