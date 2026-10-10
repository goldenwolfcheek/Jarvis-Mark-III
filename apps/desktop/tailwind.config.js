/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        jarvis: {
          bg: '#0a0f1a',
          surface: '#111827',
          blue: '#2763d1',
          glow: '#4a9eff',
          cyan: '#00d4ff',
          text: '#e2e8f0',
          muted: '#64748b',
          border: 'rgba(255,255,255,0.08)',
          success: '#22c55e',
          green: '#22c55e', // alias — existing components use jarvis-green
          green: '#22c55e',  // alias — existing components use jarvis-green
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'slide-up': 'slideUp 250ms ease-out',
        'slide-down': 'slideDown 250ms ease-out',
        'fade-in': 'fadeIn 200ms ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 6px rgba(0,212,255,0.4)' },
          '50%': { boxShadow: '0 0 12px rgba(0,212,255,0.8)' },
        },
      },
    },
  },
  plugins: [],
}
