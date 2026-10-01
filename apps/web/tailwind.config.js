/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: '#121417',
        panel: '#1a1d23',
        'panel-hover': '#1f2229',
        border: '#2a2e36',
        'border-hover': '#363b46',
        muted: '#6b7280',
        foreground: '#e5e7eb',
        accent: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          muted: 'rgba(59, 130, 246, 0.12)',
        },
        positive: '#22c55e',
        warning: '#eab308',
        danger: '#ef4444',
        turkey: {
          red: '#E30A17',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '6px',
        input: '6px',
        button: '6px',
        modal: '10px',
      },
      fontSize: {
        display: ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        section: ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        small: ['11px', { lineHeight: '1.4', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};
