/* Checks that need the file system: asset paths in app.json and the generated illustration module. */
const fs = require('node:fs');
const path = require('node:path');
const appConfig = require('../app.json');
const { buildModule, inlineStyles } = require('./build-illustrations');

const root = path.join(__dirname, '..');

describe('app assets', () => {
  it('every icon, splash and favicon path in app.json exists, with no template asset left', () => {
    const files = JSON.stringify(appConfig.expo).match(/\.\/assets\/[^"]+/g) ?? [];
    expect(files.length).toBeGreaterThanOrEqual(7);
    for (const file of files) expect(fs.existsSync(path.join(root, file))).toBe(true);
    expect(fs.existsSync(path.join(root, 'assets', 'images'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'assets', 'fonts'))).toBe(false);
  });

  it('keeps illustration-xml.ts in sync with assets/illustrations (run `npm run illustrations`)', () => {
    const generated = fs.readFileSync(path.join(root, 'src', 'ui', 'illustration-xml.ts'), 'utf8');
    expect(generated.replace(/\r\n/g, '\n')).toBe(buildModule());
  });

  it('turns inline styles into attributes, the style winning', () => {
    expect(inlineStyles('<path fill="#000" d="M0" style="fill:var(--primary);isolation:isolate"/>')).toBe('<path fill="var(--primary)" d="M0"/>');
  });
});
