// Builds the app icon, Android adaptive icon layers, splash marks and favicon into apps/assets/brand/.
// The rasterizer is not an app dependency: install it in a scratch folder and point NODE_PATH at it, from apps/:
//   npm i --prefix <scratch> @resvg/resvg-js
//   NODE_PATH=<scratch>/node_modules node scripts/build-app-icons.js
// Mark geometry and colours must match docs/design/brand/logo.svg and src/ui/brand.tsx.
const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

const out = path.join(__dirname, '..', 'assets', 'brand');
fs.mkdirSync(out, { recursive: true });

const PRIMARY = '#006967';
const ON_PRIMARY = '#f9fdfc';
const PRIMARY_DARK = '#5dc9c0';
const ON_PRIMARY_DARK = '#031a1b';

const mark = (stroke) => `<g fill="none" stroke="${stroke}" stroke-linecap="round" stroke-linejoin="round">
  <path d="M214 204V162a46 46 0 0 1 92 0v42" stroke-width="34"/>
  <path d="M168 208H344" stroke-width="44"/>
  <path d="M306 208V302L222 386L156 320" stroke-width="44"/>
</g>`;
const square = (fill, rx = 113) => `<rect width="512" height="512" rx="${rx}" fill="${fill}"/>`;
const svg = (body, viewBox = '0 0 512 512') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;

/**
 * Android adaptive layers are 108 dp with only the middle 72 dp visible (66 dp safe circle): the 512 grid fills 70 %
 * of the canvas, so the mark stays inside the safe circle at the same visual size as the iOS icon.
 */
const adaptive = (body) => {
  const size = 512 / 0.7;
  const offset = (512 - size) / 2;
  return svg(body, `${offset} ${offset} ${size} ${size}`);
};

const files = [
  // iOS: full-bleed and opaque (the system rounds the corners).
  ['icon.png', svg(square(PRIMARY, 0) + mark(ON_PRIMARY)), 1024],
  ['adaptive-foreground.png', adaptive(mark(ON_PRIMARY)), 1024],
  ['adaptive-background.png', svg(square(PRIMARY, 0)), 1024],
  // Themed icons: the system tints the opaque pixels, so only the mark is drawn.
  ['adaptive-monochrome.png', adaptive(mark('#ffffff')), 1024],
  // Splash: the logo on transparent, centred by expo-splash-screen on the theme background.
  ['splash-icon.png', svg(square(PRIMARY) + mark(ON_PRIMARY)), 1024],
  ['splash-icon-dark.png', svg(square(PRIMARY_DARK) + mark(ON_PRIMARY_DARK)), 1024],
  ['favicon.png', svg(square(PRIMARY) + mark(ON_PRIMARY)), 48],
];

for (const [name, source, size] of files) {
  const image = new Resvg(source, { fitTo: { mode: 'width', value: size } }).render();
  fs.writeFileSync(path.join(out, name), image.asPng());
  console.log(`${name} ${image.width}x${image.height}`);
}
