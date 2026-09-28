/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        glass: {
          50: 'rgba(255, 255, 255, 0.03)',
          100: 'rgba(255, 255, 255, 0.06)',
          200: 'rgba(255, 255, 255, 0.1)',
          300: 'rgba(255, 255, 255, 0.15)',
          400: 'rgba(255, 255, 255, 0.25)',
          border: 'rgba(255, 255, 255, 0.12)',
          'border-bright': 'rgba(255, 255, 255, 0.25)',
          highlight: 'rgba(255, 255, 255, 0.08)',
        },
        brand: {
          cyan: '#06b6d4',
          teal: '#14b8a6',
          violet: '#8b5cf6',
          fuchsia: '#d946ef',
          blue: '#3b82f6',
          dark: '#090d16',
          darker: '#05070c',
          card: '#0f172a80',
        }
      },
      boxShadow: {
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.37)',
        'glass-md': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'glass-lg': '0 12px 48px 0 rgba(0, 0, 0, 0.55)',
        'glow-cyan': '0 0 25px -3px rgba(6, 182, 212, 0.35)',
        'glow-violet': '0 0 25px -3px rgba(139, 92, 246, 0.35)',
        'glow-emerald': '0 0 25px -3px rgba(16, 185, 129, 0.35)',
      },
      backdropBlur: {
        xs: '2px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'glow-pulse': 'glow 3s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { opacity: '0.4' },
          '100%': { opacity: '0.8' },
        }
      }
    },
  },
  plugins: [],
}
