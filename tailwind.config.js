/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#FF5A5F',
        'primary-light': '#FFF0F0',
        background: '#FBF8F6',
        surface: '#FFFFFF',
        'text-primary': '#2D2D2D',
        'text-secondary': '#6B6B6B',
        'text-tertiary': '#A0A0A0',
        border: '#F0EDED',
        success: '#00A699',
        visited: '#66BB6A',
        warning: '#FFB400',
        star: '#FFB400',
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
