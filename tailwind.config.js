/** @type {import('tailwindcss').Config} */
const { palette } = require("./src/theme/palette");

module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Los colores salen de src/theme/palette.js como variables que ThemeProvider cambia con el tema.
      colors: {
        ...Object.fromEntries(
          Object.keys(palette.light).map((name) => [name, `rgb(var(--color-${name}) / <alpha-value>)`]),
        ),
        // Alias de nombres antiguos: success es el verde de Visitado.
        success: 'rgb(var(--color-visited) / <alpha-value>)',
      },
      borderRadius: {
        card: '16px',
        button: '12px',
        input: '12px',
        modal: '20px',
        pill: '9999px',
      },
      fontSize: {
        hero: ['32px', { lineHeight: '40px' }],
        title: ['24px', { lineHeight: '32px' }],
        subtitle: ['18px', { lineHeight: '26px' }],
        body: ['16px', { lineHeight: '24px' }],
        caption: ['13px', { lineHeight: '18px' }],
        label: ['11px', { lineHeight: '16px' }],
      },
    },
  },
  plugins: [],
};
