import appConfig from '../../app.json';
import { brand } from './brand';

describe('brand', () => {
  const { expo } = appConfig;

  it('app.json carries the same name as brand.ts, including permission prompts', () => {
    expect(expo.name).toBe(brand.name);
    expect(expo.slug).toBe(brand.name.toLowerCase());
    const prompts = JSON.stringify(expo.plugins).match(/Allow [^"]+/g) ?? [];
    expect(prompts.length).toBeGreaterThan(0);
    for (const prompt of prompts) expect(prompt).toContain(brand.name);
  });
});
