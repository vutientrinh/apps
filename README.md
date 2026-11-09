# Payment Shopper: mobile app

The shopper app of the Payment Project, a learning project about how a **marketplace with a built-in
e-wallet** works (escrow, ledger, refunds). Built with **Expo SDK 58 + Expo Router**. It runs in
**Expo Go** on a real phone and in the browser (`npm run web`), with no native build needed.
The web storefront, seller portal and back office live in the sibling repo
[`frontend`](https://github.com/vutientrinh/frontend).

## What's in the app

| Tab / flow | Screens |
| --- | --- |
| **Home** | Deals, quick actions (Scan QR, Top up, Send), product grid |
| **Categories / Search** | Category tree, search with sort and filters, shop pages |
| **Product** | Gallery, price and discount, variants, shipping, seller, specs, reviews, sticky buy bar |
| **Cart → Checkout → Pay** | Cart grouped by seller, address and shipping, pay by wallet (OTP if needed), order success |
| **Orders** | My orders, order detail with a tracking timeline |
| **Wallet** | Balance with a hide toggle, daily limit, top up, send money, scan QR, my QR, statement, receipts |
| **Me** | Sign in / register / OTP, profile, addresses, help, notifications |

Money is always a decimal string (big.js), never a float. Payment, checkout and transfer requests
send an `Idempotency-Key`, so a retry never charges twice.

## Folder layout this repo expects

This repo is the `apps/` folder of the Payment Project and uses two sibling folders:

```
Payment_Project/
  apps/                 ← this repo
  frontend/             ← web repo: its TypeScript contract types are imported type-only via `@web/*`
  tools/mock-server/    ← fake backend on :4010 that reuses frontend/src/mocks
```

Type-checking needs `../frontend`. Running against the mock API needs `../tools/mock-server`.

## Run it

1. Start the mock API, from `apps/`: `npm run mock`. This is the same as
   `cd ../tools/mock-server && npm install && npm run mock`.
2. Install and start the app:
   ```bash
   npm install
   npm run start     # QR code for Expo Go
   npm run web       # or open it in the browser
   ```
3. **On a real phone:** connect the phone and computer to the same Wi-Fi. Create `.env.local` with
   `EXPO_PUBLIC_API_URL=http://<your-PC-LAN-IP>:4010/api` (find the IP with `ipconfig`). Install
   **Expo Go** (it must support SDK 58), scan the QR code, and allow local-network access. If
   Windows Firewall asks, allow Node on private networks.
   Without `.env.local` the app uses the Expo dev server's host, falling back to `localhost`.

Demo login: **`0900000001` / `demo123`**. The OTP is `123456`, and the app offers it as a "Dev code ·
Fill" chip. Reset the mock data with `POST http://localhost:4010/__reset`.

The iOS simulator needs a Mac. On Windows, use a real phone, `npm run web`, or an Android emulator
(Android Studio, then `npm run android`).

## Design

Tokens follow the project brand plan (`docs/design/DESIGN.md` in the main project) and match the web app:

- **Colour:** Hạ Long jade as the primary colour, tinted neutrals, and a lotus accent used only for
  sale prices. Light and dark themes come from the same tokens.
- **Type:** Be Vietnam Pro for titles and money; the platform font for body text.
- **Money:** every amount goes through the `Money` component (`src/ui`). It uses tabular figures
  and a smaller, muted ₫, and the balance is the largest number on its screen.
- Touch targets are at least 44 pt, icons come from Lucide, and the app follows the system
  reduce-motion setting.

Tokens live only in `src/theme`; screens never use raw colours.

## Project layout

```
app/              Expo Router routes: (auth), (tabs)/{index,categories,wallet,cart,me},
                  product, shop, search, checkout, pay, order-success, orders, wallet/*, notifications
src/lib/          API client, auth and session (expo-secure-store), query client, money and date helpers
src/ui/           shared components: Button, Input, OtpInput, Money, Icon, StatusBadge, ...
src/theme/        tokens.ts (light/dark), theme.ts, fonts
src/features/     shop, orders, wallet: screens, hooks, logic and tests
```

## Stack

Expo 58 · React Native 0.88 · Expo Router · TypeScript (strict) · TanStack Query · Zod · NativeWind ·
expo-secure-store · Reanimated · expo-camera · Lucide icons · Jest (jest-expo) + React Native Testing Library.

## Quality gate

Run these from this folder before you push:

```bash
npx tsc --noEmit
npx expo lint          # 0 errors, 0 warnings
npx jest               # 12 suites, 58 tests
npx expo export --platform web
```

## Notes

- Registration asks for the password before the OTP, matching `POST /auth/register` and the web
  flow. The account becomes active after phone verification.
- `saveImageToLibrary(uri)` (`src/lib/image-library.ts`) saves a local `file://` image with
  write-only photo permission and returns `{ ok, message }`.
