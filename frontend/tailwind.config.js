/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space': {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
        },
        'rocket': {
          orange: '#ff6b35',
          blue: '#00d4ff',
          green: '#00ff88',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'display': ['Orbitron', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

