/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: '#FF6B4A',
          dark: '#E85A3A',
          light: '#FF8266',
        },
        cream: '#FFF8F0',
        charcoal: {
          DEFAULT: '#1A1A1A',
          light: '#2A2A2A',
        },
        slate: '#3A3A3A',
        muted: '#6B6B6B',
        subtle: '#9A9A9A',
        surface: {
          DEFAULT: '#0F0F0F',
          elevated: '#1A1A1A',
          overlay: '#252525',
        },
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['nextup'],
  },
};
