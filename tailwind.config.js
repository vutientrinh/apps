/** Tokens mirror src/theme/tokens.ts and docs/design/DESIGN.md. Use these names only, never Tailwind palette classes. */
const color = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const names = [
  'background', 'foreground', 'card', 'card-foreground', 'surface-raised', 'muted', 'muted-foreground', 'border', 'input',
  'primary', 'primary-foreground', 'ring', 'deal', 'deal-muted', 'success', 'warning', 'destructive', 'destructive-foreground',
  'status-pending', 'status-processing', 'status-completed', 'status-failed', 'status-refunded',
];

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: Object.fromEntries(names.map((name) => [name, color(name)])),
      borderRadius: { sm: '4px', md: '8px', lg: '14px', card: '14px', full: '9999px' },
      spacing: { safe: '16px' },
      fontFamily: {
        display: ['BeVietnamPro_700Bold'],
        title: ['BeVietnamPro_600SemiBold'],
        money: ['BeVietnamPro_600SemiBold'],
      },
      fontSize: {
        display: ['34px', { lineHeight: '38px', letterSpacing: '-0.68px' }],
        h1: ['28px', { lineHeight: '32px', letterSpacing: '-0.42px' }],
        h2: ['22px', { lineHeight: '27px', letterSpacing: '-0.22px' }],
        h3: ['18px', { lineHeight: '23px' }],
        body: ['16px', { lineHeight: '24px' }],
        small: ['14px', { lineHeight: '20px' }],
        caption: ['12px', { lineHeight: '17px', letterSpacing: '0.12px' }],
      },
    },
  },
  plugins: [],
};
