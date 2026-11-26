/**
 * The product's identity, in one place (DESIGN.md §7–8, DESIGN-PLAN-v2 §2.1). Same values as the web
 * `frontend/src/config/brand.ts`. Every title, header and share text reads the name from here; never hard-code it.
 * `app.json` repeats the name (Expo reads static JSON); `src/config/brand.test.ts` keeps the two in sync.
 */
export const brand = {
  name: 'Jadeway',
  /** Where space is tight: app icon label. */
  shortName: 'Jadeway',
  tagline: 'Shop and pay, one way.',
} as const;
