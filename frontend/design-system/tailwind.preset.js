// Preset Tailwind 3 "Obras": mesmos nomes de token do tailwind.config.js atual do app (Stitch),
// valores vindos de tokens.css (claro/escuro). Uso:
//   import obras from './design-system/tailwind.preset.js'
//   export default { presets: [obras], content: [...], theme: { extend: {} } }
// Remova colors/fontFamily do `extend` antigo, senão eles sobrescrevem o preset.
const c = (name) => `rgb(var(--ob-${name}) / <alpha-value>)`

const colorNames = [
  'background', 'surface', 'surface-bright', 'surface-dim', 'surface-container-lowest', 'surface-container-low',
  'surface-container', 'surface-container-high', 'surface-container-highest', 'surface-variant', 'surface-tint',
  'on-background', 'on-surface', 'on-surface-variant', 'outline', 'outline-variant',
  'inverse-surface', 'inverse-on-surface', 'inverse-primary',
  'primary', 'on-primary', 'primary-container', 'on-primary-container', 'primary-fixed', 'primary-fixed-dim', 'on-primary-fixed', 'on-primary-fixed-variant',
  'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container', 'secondary-fixed', 'secondary-fixed-dim', 'on-secondary-fixed', 'on-secondary-fixed-variant',
  'tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container', 'tertiary-fixed', 'tertiary-fixed-dim', 'on-tertiary-fixed', 'on-tertiary-fixed-variant',
  'error', 'on-error', 'error-container', 'on-error-container',
  'accent', 'on-accent', 'accent-text', 'info', 'info-container', 'on-info-container',
]

const sans = ['Geist', 'system-ui', '-apple-system', 'sans-serif']
// títulos: peso 500 e tracking apertado (assinatura da Pierre); nomes iguais aos do app
const title = (size, line, weight = '500') => [size, { lineHeight: line, fontWeight: weight, letterSpacing: '-0.03em' }]

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: Object.fromEntries(colorNames.map((n) => [n, c(n)])),
      borderRadius: { DEFAULT: '0.25rem', lg: '0.5rem', xl: '0.75rem', '2xl': '1rem', '3xl': '1.5rem', '4xl': '2.25rem', full: '9999px' },
      fontFamily: {
        body: sans, headline: sans, callout: sans, subheadline: sans, footnote: sans,
        'large-title': sans, 'title-1': sans, 'title-2': sans, 'title-3': sans, 'caption-1': sans, 'caption-2': sans,
        sans, mono: ['Geist Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        body: ['17px', { lineHeight: '22px', fontWeight: '400' }],
        callout: ['16px', { lineHeight: '21px', fontWeight: '400' }],
        subheadline: ['15px', { lineHeight: '20px', fontWeight: '400' }],
        footnote: ['13px', { lineHeight: '18px', fontWeight: '400' }],
        headline: ['17px', { lineHeight: '22px', fontWeight: '600' }],
        'caption-1': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'caption-2': ['11px', { lineHeight: '13px', fontWeight: '600' }],
        'title-3': title('20px', '25px', '600'),
        'title-2': title('22px', '28px'),
        'title-1': title('28px', '34px'),
        'large-title': title('34px', '38px'),
        display: title('clamp(2.5rem, 2rem + 2vw, 3.75rem)', '1.02'),
      },
      transitionTimingFunction: { card: 'cubic-bezier(.25,.46,.45,.94)' },
      transitionDuration: { ui: '200ms', med: '300ms', menu: '400ms', enter: '700ms' },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(20%)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'menu-open': { from: { clipPath: 'polygon(0 0,100% 0,100% 0,0 0)' }, to: { clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)' } },
        'menu-close': { from: { clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)' }, to: { clipPath: 'polygon(0 0,100% 0,100% 0,0 0)' } },
      },
      animation: {
        'fade-up': 'fade-up .7s ease-out both',
        'menu-open': 'menu-open .4s ease-in-out both',
        'menu-close': 'menu-close .4s ease-in-out both',
      },
    },
  },
}
