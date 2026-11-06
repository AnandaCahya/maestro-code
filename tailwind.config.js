/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#121318',          // Warm deep charcoal slate (cozy night ambiance)
          card: '#191b22',        // Soft warm card container
          cardHover: '#20232c',   // Subtle cozy hover
          surface: '#1e2028',     // Raised surface panels
          border: '#272a36',      // Very subtle, quiet border
          borderHover: '#383c4c', // Soft border focus
          text: '#e6e8ec',        // Warm readable text
          muted: '#8b90a0',       // Soft muted gray
          subtle: '#474b5b',      // Quiet dividers
          accent: '#e0a96d',      // Warm Honey Amber (cozy desk lamp glow)
          accentHover: '#d49a5b',
          accentGlow: 'rgba(224, 169, 109, 0.18)',
          violet: '#a79bc4',      // Muted lavender
          cyan: '#82b0c4',        // Calm dusty teal
          emerald: '#88c096',     // Gentle matcha green
          amber: '#e5aa66',       // Warm lantern amber
          rose: '#d97f7f'         // Soft warm clay
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Cascadia Code"', 'monospace']
      },
      boxShadow: {
        'glow-accent': '0 0 20px -4px rgba(224, 169, 109, 0.2)',
        'glow-cyan': '0 0 20px -4px rgba(130, 176, 196, 0.2)',
        'studio-card': '0 8px 24px -6px rgba(0, 0, 0, 0.35)'
      }
    }
  },
  plugins: []
}
