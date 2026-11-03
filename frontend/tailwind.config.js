import obras from './design-system/tailwind.preset.js'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [obras],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      spacing: {
        'space-lg': '1rem',
        gutter: '1rem',
        'space-sm': '0.5rem',
        'space-xs': '0.25rem',
        'space-xl': '1.5rem',
        'space-md': '0.75rem',
        margin: '1rem',
      },
    },
  },
  plugins: [],
}
