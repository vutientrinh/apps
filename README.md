# Payment Shopper (Expo)

Expo SDK 58 + Expo Router app for the Payment Project customer journey. The app is Expo Go compatible and uses the shared Node mock API backed by the web MSW handlers.

## Run on a phone

1. On the computer, start the API: `cd tools/mock-server && npm install && npm run mock`.
2. Find the computer's LAN IPv4 address and create `apps/.env.local` with `EXPO_PUBLIC_API_URL=http://<LAN-IP>:4010/api` (for example `http://192.168.1.20:4010/api`).
3. Connect the phone and computer to the same Wi-Fi, then run `cd apps && npm install && npm run start`.
4. Open Expo Go, scan the QR code, and allow local-network access if prompted.

The API default derives the host from the Expo dev server connection and falls back to `localhost`; set the explicit LAN URL when using a physical phone. Mock login is `0900000001` / `demo123`. Reset mock data with `POST http://localhost:4010/__reset`.

## Quality gate

From this directory run `npx tsc --noEmit`, `npx expo lint`, `npx jest`, and `npx expo export --platform web`.

## Mobile implementation notes

- Password-before-OTP is the accepted registration flow per Lead decision. It matches the existing `POST /auth/register` contract and web W-01; the account becomes active after phone verification.
- `saveImageToLibrary(uri)` in `src/lib/image-library.ts` accepts a local `file://` image URI and returns `{ ok, message }`. It requests write-only photo-library permission and returns a user-friendly message when access is denied or saving fails.
