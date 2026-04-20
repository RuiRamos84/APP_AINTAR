/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        aintar: {
          navy:    '#0A1628',
          mid:     '#122040',
          blue:    '#1B5E8E',
          blueMid: '#2074AA',
          sky:     '#29B5E8',
          teal:    '#2ABB9B',
          light:   '#EFF6FC',
          tag:     '#1A6B82',
        },
      },
      fontFamily: {
        heading: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'wave-slow':   'wave 12s linear infinite',
        'wave-medium': 'wave 8s linear infinite',
        'wave-fast':   'wave 6s linear infinite',
        'float':       'float 6s ease-in-out infinite',
        'fade-up':     'fadeUp 0.6s ease-out forwards',
        'pulse-slow':  'pulse 4s ease-in-out infinite',
      },
      keyframes: {
        wave: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        wavePulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.7' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #0A1628 0%, #122040 50%, #0D1F3C 100%)',
        'blue-gradient': 'linear-gradient(135deg, #1B5E8E 0%, #2074AA 100%)',
        'teal-gradient': 'linear-gradient(135deg, #2ABB9B 0%, #29B5E8 100%)',
      },
    },
  },
  plugins: [],
}
