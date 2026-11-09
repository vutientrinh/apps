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
| `Screen` | `children`, `refreshing`, `onRefresh`, `scroll` (default true), `style` |
| `AppHeader` | `title`, `subtitle`, `onBack`, `right` |
| `Button` | `title`, `onPress`, `variant` (`primary secondary ghost destructive`), `icon`, `loading`, `disabled`. 48 pt. Destructive only inside a confirm sheet |
| `TextField` | `label`, `error`, `hint`, `trailing`, plus `TextInputProps` |
| `PasswordToggle` | `visible`, `onToggle`, for `TextField trailing` |
| `OtpInput` | `value`, `onChange`, `onComplete`, `length`, `error`, `disabled`, `autoFocus`; ref `.focus()` |
| `StatusBadge` | `status`, `tone`, `icon` (Lucide name), `label`; icon + label |
| `Card` | Units you act on (product, address, payment method). Border only, radius lg |
| `ListItem` / `ListRow` | `title`, `subtitle`, `leading`, `trailing`, `onPress`, `chevron`, `divider`. Full-bleed lists |
| `Divider`, `Skeleton`, `EmptyState` (`icon`), `ErrorState` | |
| `BottomSheet` | `visible`, `title`, `onClose`; elevation 2, fades when reduce motion is on |
| `Toast`, `OfflineBanner`, `QuantityStepper`, `SegmentedTabs`, `Icon` (`name`: typed Lucide name) | |
