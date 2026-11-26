# Shared mobile UI

Design source: `docs/design/DESIGN.md` (tokens, Be Vietnam Pro, ledger numerals) + the `ui-taste` skill.
Everything is exported from `@/ui`. Components read colours through `useTokens()` and never hard-code hex.

## Theme (`@/theme/tokens`, `@/theme/theme`)

| Export | What |
|---|---|
| `useTokens()` | Colour tokens for the active scheme: `background card surfaceRaised muted foreground mutedForeground border input primary primaryForeground ring deal dealMuted success warning destructive destructiveForeground scrim statusPending/Processing/Completed/Failed/Refunded` |
| `withAlpha(token, 0.1)` | 10% tints (selected rows, status chips) |
| `radius` | `sm 4` chips/badges · `md 8` buttons/inputs · `lg 14` cards/sheets/images · `full` pills/avatars (`tokens.radius` is deprecated = 8) |
| `type` | `display h1 h2 h3 body small caption` text styles (Be Vietnam Pro on display/titles/caption, platform font on body). Don't add `fontWeight` to a Be Vietnam Pro style |
| `fontFamily` | `display` (700) · `title` (600) · `money` (600) · `medium` (500) · `mono` |
| `space`, `touchTarget` (48), `motion`, `elevation(level, scheme)` | spacing scale, min target, durations, shadow (none in dark) |
| `useReducedMotion()` (`@/lib/motion`) | true when the OS reduce-motion setting is on |

`deal`/`dealMuted` are for price/discount UI in shopping only.

## Components

| Component | Props |
|---|---|
| `Money` | **The signature: every amount.** `amount` (decimal string), `currency`, `size` (type token, default `body`; `display` for balance/checkout total), `direction` (`in` → `+` success, `out` → `−`), `tone` (`default muted success deal`), `strike`, `style` (number style; mark follows its size/colour). Renders `1.250.000 ₫` |
| `AppText` | `variant` (type token), `tone` (`default muted primary success warning destructive deal`) |
| `Screen` | `children`, `refreshing`, `onRefresh`, `scroll` (default true), `style`, `edges` (safe-area edges, default all). With a `BottomBar` inside, pass `edges={['top', 'left', 'right']}`, or keep the bar a sibling of `Screen`, so the bottom inset is applied once |
| `AppHeader` | `title`, `subtitle`, `onBack` (handler, or `true` = back / Home), `right` (`IconButton`s), **`large`** (h1, no divider: tab roots Home/Categories/Wallet/Cart/Me/My orders). Pushed screens use the compact default (back + h3 + divider) |
| `IconButton` | `icon`, `accessibilityLabel`, `onPress`, `badge`, `color`, `style`. Round 48 pt, scales on press. Header/toolbar actions |
| `PressableScale` | `Pressable` props + `scaleTo` (0.97), `haptic`, `containerStyle` (wrapper, e.g. `flex: 1`). Press feedback for tiles/cards; no scale with reduce motion |
| `SectionHeader` | `title`, `actionLabel`, `onAction` ("See all" link, 48 pt) |
| `Button` | `title`, `onPress`, `variant` (`primary secondary ghost destructive`), `icon`, `loading`, `disabled`, `size` (`md` 48 pt · `sm` 40 pt + hit slop, inline row actions). Scales to 98% on press. Destructive only inside a confirm sheet |
| `TextField` | `label`, `error`, `hint`, `trailing`, plus `TextInputProps`. Border + focus ring sit on a wrapper (1 pt `ring` border + 1 pt outer ring), no browser outline on web; `style` styles the inner input |
| `CatalogImage` | `uri`, `size` (fixed square) or `fill` (square at parent width), `rounded` (lg), `accessibilityLabel`. Muted plate; data-SVG, bitmap or ImageOff placeholder |
| `BottomBar` | `action` `{ title, onPress, disabled, loading, icon }`, `amount` + `label` ("Total") + `caption`, or `children` for a custom left side; `secondaryAction`; `onHeight`. Absolute, card surface, hairline top, bottom = max(safe-area, 12) |
| `PasswordToggle` | `visible`, `onToggle`, for `TextField trailing` |
| `OtpInput` | `value`, `onChange`, `onComplete`, `length`, `error`, `disabled`, `autoFocus`; ref `.focus()` |
| `StatusBadge` | `status`, `tone`, `icon` (Lucide name), `label`; icon + label |
| `Card` | Units you act on (product, address, payment method). Border only, radius lg |
| `ListItem` / `ListRow` | `title`, `subtitle`, `leading`, `trailing`, `onPress`, `chevron`, `divider`, `inset` (16 pt side padding inside `ListGroup`), `dividerInset` (start the divider under the text), `destructive`. Full-bleed lists |
| `ListGroup` | `label`, `children`: edge-to-edge settings block (cancels the screen padding); rows use `inset` |
| `IconTile` | `icon`, `tone` (`primary muted destructive success`), `size` (40): round tinted icon for row leading/shortcut tiles |
| `Divider`, `Skeleton` (`width`/`height`, or `aspectRatio` for a real square on web; `rounded` radius key; pulses in sync, static with reduce motion), `EmptyState`, `ErrorState` (see Brand and artwork) | |
| `BottomSheet` | `visible`, `title`, `onClose`; elevation 2, fades when reduce motion is on |
| `Toast` | `visible`, `message`, `icon`, `actionLabel`, `onAction`, `onDismiss`. Slides up + fades in (180 ms) |
| `OfflineBanner`, `QuantityStepper`, `SegmentedTabs`, `Icon` (`name`: typed Lucide name) | |

## Brand and artwork (TASK-029)

| Export | Props / rules |
|---|---|
| `brand` (`@/config/brand`) | `name`, `shortName`, `tagline`. Use it in every title and share text; never type the product name |
| `BrandMark`, `Wordmark` | Logo mark (`size`) and mark + name lockup |
| `BrandGradient` | `style`, `children`; stops = `tokens.brandGradient`, text on it = `primaryForeground`. Only hero, auth, onboarding, splash |
| `Illustration` | `name` (`IllustrationName`, 15 scenes, same names as web), `height` (160). Decorative: always add a text title. Never on lists, tables, forms or the wallet card |
| `EmptyState` | `title`, `description`, one `action`, `illustration`. Without `illustration`, these icons pick a scene: `ShoppingCart Package PackageSearch SearchX Bell BellOff ReceiptText Heart MapPin WifiOff`. Other icons keep the tinted tile; `illustration={null}` forces the tile |
| `ErrorState` | `message`, `retry`; inline by default. `illustration="error-generic"` or `"offline"` when the error is the whole screen |
| `CampaignStrip` | `query={useCampaigns()}` (`@/lib/campaigns`); home banner strip, edge to edge inside a 16 pt screen |

## Tests

`jest.setup.tsx` mocks `lucide-react-native` globally: every icon renders `<View testID="icon-<Name>" />`. Don't add a local `jest.mock('@/ui/icon')`.
