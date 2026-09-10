/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        command: {
          bg: '#0b0f19',
          surface: '#111827',
          card: '#182234',
          border: '#27354a',
          borderSubtle: '#1e293b',
          accent: '#2563eb',
          critical: '#dc2626',
          urgent: '#ea580c',
          warning: '#d97706',
          safe: '#16a34a',
          water: '#0284c7',
          gis: '#0891b2',
          muted: '#64748b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}