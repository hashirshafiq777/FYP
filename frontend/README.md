# LegalDocReader — web app

React 19 + Vite + TypeScript + react-router + plain CSS. No UI kit, no icon library,
no CSS framework.

This is the front end for LegalDocReader, a bilingual (English / Urdu) AI-powered legal
and policy document analyzer. It currently covers **Sign-Up, Login and the Dashboard**.
Authentication is wired to the real API; everything on the dashboard except the user's
own name and email is placeholder data (see [Replacing the sample data](#replacing-the-sample-data)).

For prerequisites, the backend and MongoDB setup, see the [root README](../README.md).

---

## Contents

- [Running it](#running-it)
- [Routes](#routes)
- [Design system](#design-system)
- [Internationalisation and RTL](#internationalisation-and-rtl)
- [Forms and validation](#forms-and-validation)
- [Error handling](#error-handling)
- [Replacing the sample data](#replacing-the-sample-data)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Decisions](#decisions)
- [Known gaps](#known-gaps)

---

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

The backend must be running at `http://localhost:8000` (see the root README).

### How the app finds the API

The app calls the API at **the same origin the page was served from** (`/api/v1`), and the
Vite dev server proxies `/api` to `http://127.0.0.1:8000` (see `vite.config.ts`). There is
no cross-origin request, so CORS is not involved in local development at all.

Set `VITE_API_BASE_URL` only when the API lives on a *different host* from the page, e.g.
a deployed backend. Put it in `frontend/.env.local`:

```ini
VITE_API_BASE_URL=https://api.example.com/api/v1
```

> **Vite does not read `.env.example`.** It reads `.env`, `.env.local`, `.env.<mode>` and
> `.env.<mode>.local`. Editing `.env.example` has no effect — copy it to `.env.local` first.
> Only variables prefixed with `VITE_` are exposed to the browser.

### Port forwarding / sharing a dev URL

**Forward port 5173 only.** Because the API is reached through the same origin, the tunnel
carries both the app and its API, and the tunnel's hostname never has to be configured
anywhere.

1. Forward port **5173** (VS Code: Ports panel → Forward a Port).
2. Set that port's visibility to **Public** if someone else needs to open it. A private
   dev tunnel answers with a sign-in page, which the app would report as a network error.
3. Open the forwarded URL. Nothing else to configure.

`server.host` is `true` so the dev server listens on all interfaces, and `allowedHosts`
lists the common tunnel domains (`.devtunnels.ms`, `.ngrok-free.app`, `.ngrok.io`,
`.trycloudflare.com`, `.loca.lt`) — Vite blocks unrecognised `Host` headers by default as a
DNS-rebinding guard, so a tunnel is rejected with *"Blocked request"* until its domain is
allowed. Hosts outside that list are still blocked.

Forwarding port 8000 separately also works, but then you must set `VITE_API_BASE_URL` to
the forwarded API URL **and** add the forwarded frontend origin to the backend's
`CORS_ORIGINS`. The proxy exists so you do not have to do either.

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Dev server with HMR on port 5173      |
| `npm run build`     | Type check (`tsc -b`) then production build to `dist/` |
| `npm run typecheck` | Types only                            |
| `npm run lint`      | oxlint                                |
| `npm test`          | Vitest, single run                    |
| `npm run test:watch`| Vitest in watch mode                  |
| `npm run preview`   | Serve the production build            |

> `strictPort` is on: if 5173 is taken the dev server fails rather than silently moving,
> because the backend's `CORS_ORIGINS` allowlist names that exact port.

---

## Routes

| Route         | Page             | Access         | Notes                                        |
| ------------- | ---------------- | -------------- | -------------------------------------------- |
| `/`           | —                | Any            | Redirects to `/dashboard` if signed in, else `/login` |
| `/login`      | Login            | Public only    | Signed-in visitors are sent to `/dashboard`  |
| `/signup`     | Sign-Up          | Public only    | Signed-in visitors are sent to `/dashboard`  |
| `/dashboard`  | Dashboard        | Protected      | Inside `AppShell`                            |
| `/documents`  | `ComingSoon`     | Protected      | Inside `AppShell`                            |
| `/chat`       | `ComingSoon`     | Protected      | Inside `AppShell`                            |
| `/agreements` | `ComingSoon`     | Protected      | Inside `AppShell`                            |
| `/history`    | `ComingSoon`     | Protected      | Inside `AppShell`                            |
| anything else | `NotFound` (404) | Any            | Designed page, links back to dashboard or login |

Every navigation item leads to a real page — there are no dead links. Each page sets its
own `document.title` via `useDocumentTitle`.

**Auth flow.** Visiting a protected URL while signed out redirects to `/login` with the
intended path in router state, and login returns you there afterwards. A `401` on any
request that carried a token clears the session and redirects to `/login?reason=expired`,
which shows an explanatory banner. On app start, a token mirrored in `sessionStorage` is
re-validated against `GET /auth/me` behind a branded full-page loader (`AuthGate`), so
there is never a flash of the login page on reload.

### Dev-only demo states

In dev builds (`import.meta.env.DEV`), the dashboard accepts a `demo` query parameter so
the non-happy states are reachable for QA:

```
/dashboard?demo=empty      per-widget empty states (a brand-new account)
/dashboard?demo=error      the failure state, with a working Retry
/dashboard?demo=loading    skeletons, held indefinitely
```

The parameter is ignored in production builds.

---

## Design system

**Direction: "Statute" — editorial legal-tech.** Deep ink navy on warm paper with a single
restrained brass accent; serif display type over a clean technical sans; hairline rules and
generous whitespace instead of heavy cards and drop shadows. The reference point is a
well-set legal document, not a SaaS dashboard — the product asks people to trust it with
confidential contracts, so it should read as considered and calm rather than busy.

### Tokens

Everything lives in [`src/styles/tokens.css`](src/styles/tokens.css) — colour, type scale,
spacing, radii, shadows, motion durations, z-index and component sizing. **Components never
hard-code a colour or a font size**; this is checked in review and is easy to grep for.

| Group     | Examples                                                             |
| --------- | --------------------------------------------------------------------- |
| Ink       | `--ink-950` … `--ink-100` — primary, sidebar, text                    |
| Paper     | `--paper-50` … `--paper-500` — warm surfaces (never pure white)       |
| Brass     | `--brass-100` … `--brass-700` — the single accent                     |
| Semantic  | `--risk-high-*`, `--risk-medium-*`, `--risk-low-*`, `--status-*`      |
| Surfaces  | `--surface-page`, `--surface-raised`, `--border-subtle`, `--text-*`   |
| Type      | `--font-display`, `--font-ui`, `--font-urdu-ui`, `--text-xs` … `--text-4xl` |
| Space     | `--space-1` … `--space-20`, `--gutter`, `--content-max`               |
| Motion    | `--dur-fast/base/slow`, `--ease-out`, `--ease-in-out`                 |
| Component | `--control-height`, `--touch-target`, `--sidebar-width`, `--topbar-height` |

Stylesheets load in this order from `main.tsx`: `tokens` → `base` → `components` → `auth`
→ `shell` → `dashboard`.

### Typography

- **Display:** Fraunces (variable) — a characterful modern serif for headings.
- **UI:** IBM Plex Sans (variable) — institutional and legible without reading as generic.
- **Urdu UI:** Noto Naskh Arabic, with `--leading-urdu: 2` because Naskh descenders and dot
  stacks collide at Latin line-heights.
- **Urdu display:** Noto Nastaliq Urdu, used **only** at `h1`/`h2` sizes with
  `--leading-urdu-display: 2.1` and a little bottom padding. Nastaliq is illegible below
  about 20px, so `h3`/`h4` and all body text fall back to Naskh.

All four are self-hosted via `@fontsource`, so the app works offline. Each package sets
`font-display: swap` and ships `unicode-range` subsets, so a browser only downloads the
scripts it actually renders.

### Colour and accessibility

Risk severity and processing status are **never** carried by colour alone — each level has
its own glyph (`src/components/semanticIcons.ts`) and its own text label. The chips are
readable in greyscale and for a red/green colour-blind reader.

Every text token was checked against every paper surface it is used on. The worst pair in
the system is **4.79:1** (muted text on `--paper-200`), comfortably over the 4.5:1 that
WCAG AA asks for normal text; most pairs are 6:1 or better.

### Motion

Staggered page-load reveals (`.reveal` with `--reveal-index`), smooth focus and hover
transitions, and a shimmer on skeletons. All of it collapses under
`@media (prefers-reduced-motion: reduce)`.

### Brand

The logomark is a document whose lower half becomes a balance beam — "legal" and "document"
in one shape, legible down to 16px. It is inline SVG (`LogoMark` in
[`src/components/icons.tsx`](src/components/icons.tsx)); `public/favicon.svg` is the same
drawing. There are no external images or stock photos anywhere in the app.

---

## Internationalisation and RTL

A small custom layer — no i18n library.

```tsx
import { useI18n } from "./i18n/useI18n";

const { t, language, direction, setLanguage, formatDate, formatRelativeTime, formatNumber } =
  useI18n();

t("dashboard.greeting", { name: "Ayesha" });   // "Welcome back, Ayesha"
```

### Adding or changing a string

1. Add the key to [`src/i18n/en.ts`](src/i18n/en.ts). English is the source of truth.
2. Add the same key to [`src/i18n/ur.ts`](src/i18n/ur.ts).

`ur.ts` is typed as `Dictionary = Record<keyof typeof en, string>`, so **a missing or
misspelled Urdu key fails `tsc`** — it cannot reach production. A test additionally checks
that both files have identical key sets, that no Urdu value was left as its English
original (bar the brand name and the `EN`/`UR`/`404` tokens), and that every `{placeholder}`
in an English string survives into the Urdu one.

### How RTL works

- `setLanguage` writes `<html lang>` and `<html dir>`; `dir="rtl"` for Urdu.
- **Every** layout rule uses logical properties — `margin-inline-*`, `padding-inline-*`,
  `inset-inline-*`, `border-inline-*`, `text-align: start`. There is not one `left:` or
  `right:` in the stylesheets, so the whole UI mirrors for free: the sidebar moves to the
  right, the drawer slides in from the right, the user menu anchors to the other edge.
- Directional glyphs (arrows) carry `className="icon-directional"`, which flips them under
  `[dir="rtl"]`. A "next" arrow must not point backwards in a mirrored layout.
- Things that must *not* mirror are pinned `direction: ltr`: the wordmark, email addresses,
  `EN`/`UR` badges, avatar initials, numerals and the `404`.
- Password inputs are `dir="ltr"` regardless of UI language — passwords are Latin entry and
  an RTL input puts the caret and any revealed text on the wrong side.
- **User-generated content** (document names, chat titles and snippets) uses `dir="auto"`,
  so an Urdu document name renders right-to-left even while the UI is in English.
- Numbers use Latin digits in both languages: the Urdu locale is pinned to
  `ur-PK-u-nu-latn`, so `Intl` never emits Eastern Arabic-Indic numerals.
- Urdu has no letter case, so `text-transform: uppercase` and wide tracking are switched
  off under `:lang(ur)` — they mangle Arabic script.

The language preference persists in `localStorage` (every access wrapped in `try/catch`,
because storage throws in some privacy modes).

> **The Urdu copy needs review by a native speaker.** It was written to be plain and
> everyday rather than formal legalese, and widely understood loanwords were kept in
> transliteration ("ای میل", "پاس ورڈ", "ڈیش بورڈ") instead of rare native coinages. Those
> are judgement calls a native speaker should confirm — particularly the legal category
> names in `category.*` and `agreementType.*`.

---

## Forms and validation

[`src/lib/validation.ts`](src/lib/validation.ts) holds all the rules. Validators return
**error codes**, never prose; the UI maps a code to `validation.<code>` in the active
dictionary. That keeps validation language-agnostic and testable without rendering anything.

The rules mirror the backend exactly and are never stricter:

| Field            | Rule                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Full name        | Required, trimmed, internal spaces collapsed, 2–100 chars, Unicode letters/marks plus space `'` `-` `.`, at least 2 letters |
| Email            | Required, trimmed, ≤254 chars, pragmatic format check, lowercased on submit |
| Password         | Required, 8–128 chars, not whitespace-only, **never trimmed or altered**    |
| Confirm password | Required, must match                                                        |

**Timing:** a field validates on blur, then live on every change once it has been touched —
validating as someone first types shouts at them before they have finished. Editing the
password re-checks the confirmation, so a stale "do not match" cannot persist after the
user fixes it from the other end. On submit, every error is shown at once and focus moves
to the first invalid field.

**While submitting**, inputs become `readOnly` rather than `disabled`, so focus is not
thrown away, and the button shows a spinner with `aria-busy` and blocks a second submit.

Login deliberately applies **presence only** to the password. Applying the sign-up policy
there would leak it to anyone probing the form.

`PasswordField` gives every password input its own eye toggle (`type="button"`,
`aria-pressed`, translated `aria-label`, 44px target) and a Caps Lock warning. On Sign-Up
the two toggles are independent: revealing the password must not also reveal the
confirmation, or the comparison the user is being asked to make is no longer theirs.

The strength meter is advisory — bar plus a word (Weak / Fair / Strong), never colour
alone — and never blocks submission beyond the 8-character minimum.

---

## Error handling

The API client normalises every failure into `ApiError { status, kind, fieldErrors?, message? }`.
**Raw server prose is never shown**: it is English-only, written for developers, and can
leak implementation detail. `kind` selects a translated string.

| Case                 | `kind`         | What the user sees                                         |
| -------------------- | -------------- | ----------------------------------------------------------- |
| 409 on signup        | `conflict`     | Error on the email field + an inline "Sign in instead" link  |
| 422                  | `validation`   | Mapped onto the owning field; unknown fields → generic banner |
| 401 on login         | `unauthorized` | "Incorrect email or password." Email kept, password cleared, focus moved there |
| 401 on a token request | `unauthorized` | Session cleared, redirect to `/login?reason=expired`       |
| 429                  | `rate_limited` | "Too many attempts. Please wait a moment and try again."     |
| 5xx                  | `server`       | Banner + Retry                                               |
| Network failure      | `network`      | Banner + Retry                                               |
| `navigator.onLine === false` | `offline` | Distinct offline wording + Retry                           |
| No response in 15 s  | `timeout`      | Banner + Retry (`AbortController`)                           |

422 parsing reads **both** the backend's own envelope (`error.details[].field` + `type`)
and raw FastAPI `detail[].loc` (last element), so the client keeps working if a route is
ever added without the custom handler. `full_name` is translated to the form's `fullName`.

---

## Replacing the sample data

Everything on the dashboard except the user's name and email comes from
[`src/data/dashboardData.ts`](src/data/dashboardData.ts). The types are already shaped like
the responses the backend will return, and the data is served through an async function
with a ~700 ms delay, so the loading skeletons are exercised on every visit rather than
only in theory.

To go live, change one function body:

```ts
// src/data/dashboardData.ts
export async function getDashboardData(
  options: { mode?: DemoMode; signal?: AbortSignal } = {},
): Promise<DashboardData> {
  return request<DashboardData>("/dashboard", { auth: true, signal: options.signal });
}
```

Then set `USING_SAMPLE_DATA = false` in the same file, which removes the "Sample data"
badge from the page. Nothing else changes — every widget consumes the `DashboardData`
type, not this module's internals.

If the real endpoints arrive piecemeal, split `getDashboardData` into one call per widget
and give each its own loading state; the widgets already accept `null` to mean "loading".

---

## Project structure

```
src/
├── main.tsx                  Fonts, stylesheets, I18nProvider → Router → AuthProvider
├── App.tsx                   Routes, AuthGate, root redirect
├── api/
│   ├── client.ts             fetch wrapper: token, ApiError, timeout, 401 handling
│   └── auth.ts               signUp / login / fetchMe / logout
├── auth/
│   ├── context.ts            Context + token storage key
│   ├── AuthContext.tsx       Session state, restore-on-load, expiry redirect
│   ├── useAuth.ts            Hook
│   ├── AuthGate.tsx          Branded splash while the stored token is validated
│   ├── ProtectedRoute.tsx    Redirects signed-out visitors to /login
│   └── PublicOnlyRoute.tsx   Redirects signed-in visitors away from /login, /signup
├── components/
│   ├── icons.tsx             All inline SVG icons (components only)
│   ├── semanticIcons.ts      Risk and status glyph maps
│   ├── Logo, Button, TextField, PasswordField, PasswordStrength,
│   │   Banner, Chip, SectionCard, EmptyState, Skeleton,
│   │   LanguageToggle, UserMenu, FullPageLoader, ContractPreview
│   └── dashboard/            QuickActions, StatCards, RiskOverview,
│                             DocumentsTable, ConversationsList, AgreementsList
├── data/dashboardData.ts     Static placeholder data + typed loader
├── hooks/useDocumentTitle.ts
├── i18n/                     en.ts, ur.ts, context.ts, I18nProvider.tsx, useI18n.ts
├── layouts/                  AuthLayout (brand panel), AppShell (sidebar/drawer/topbar)
├── lib/                      validation.ts, apiErrors.ts, initials.ts
├── pages/                    Login, SignUp, Dashboard, ComingSoon, NotFound
├── styles/                   tokens, base, components, auth, shell, dashboard
└── test/                     setup.ts, renderWithProviders.tsx
```

---

## Testing

Vitest + Testing Library + jsdom. **148 tests** across 8 files.

```bash
npm test
```

| File                           | Covers                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `lib/validation.test.ts`       | Every validator, table-driven: empty, whitespace, boundary lengths (1/2/100/101 name, 7/8/128/129 password), Urdu and accented names, bad emails, mismatch, strength levels |
| `api/client.test.ts`           | Status→kind mapping, offline vs network, timeout, 422 field mapping in both envelope shapes, 401 handler firing for token requests but **not** for login |
| `components/PasswordField.test.tsx` | Toggle switches input type, `aria-pressed` and label update together, independent toggles per field, value preserved, Urdu label |
| `pages/SignUp.test.tsx`        | Errors shown and **API not called** when invalid, focus on first invalid field, `aria-invalid`/`aria-describedby`, blur-then-live timing, confirm re-check, normalised submission, 409/422/500 handling |
| `pages/Login.test.tsx`         | 401 → banner, byte-identical feedback for unknown email vs wrong password, password cleared and focused, no signup policy applied, 429/5xx/offline, `?reason=expired` |
| `pages/Dashboard.test.tsx`     | Skeleton → loaded, all seven blocks, sample badge, chips carry text + glyph, `dir="auto"` on user content, empty state, error state + Retry, rows not clickable |
| `layouts/AppShell.test.tsx`    | Nav targets, `aria-current`, skip link, landmarks, drawer focus/Esc/scroll-lock, user menu `aria-haspopup`/Esc/click-outside/focus return, logout, route protection, revoked-token cleanup |
| `i18n/i18n.test.tsx`           | Identical key sets, no untranslated Urdu, placeholders preserved, `lang`/`dir` switching, persistence, Latin digits, storage failure tolerated |

Network is mocked at `fetch` in tests only — there is no mock auth in the app itself.

---

## Decisions

1. **"Statute" over a generic SaaS look.** Ink-on-paper with one brass accent, a serif
   display face and hairline rules. A tool handling someone's contracts should feel like a
   considered document, and the deliberately narrow palette is also what keeps the semantic
   risk colours meaningful — if everything were coloured, red would stop meaning "look here".
2. **Fraunces + IBM Plex Sans**, not Inter or a system stack. Inter is the default look of
   AI-generated UI; Plex has an institutional character that suits the subject, and Fraunces
   gives headings a voice without being decorative.
3. **Self-hosted fonts via `@fontsource`.** No CDN request, so the app works offline, and no
   third party learns who is reading which contract.
4. **Nastaliq for Urdu display only, Naskh everywhere else.** Nastaliq is beautiful and
   culturally expected, but it is unreadable at UI sizes and clips without a very generous
   line-height. This is the compromise flagged for native-speaker review.
5. **Logical properties everywhere, with no RTL stylesheet.** One set of rules serves both
   directions. The alternative — a mirrored override sheet — drifts out of sync the moment
   someone adds a rule.
6. **English dictionary as the type source.** Making `ur.ts` satisfy `Record<keyof typeof en, string>`
   turns "someone forgot to translate this" from a runtime surprise into a build failure.
7. **Validators return codes, not messages.** The alternative — returning English strings —
   makes a bilingual form impossible to test and impossible to translate.
8. **Error codes, not server prose.** `ApiError.kind` drives a translated string; the
   server's own message is kept only for diagnostics.
9. **`readOnly`, not `disabled`, while submitting.** Disabling the focused input drops focus
   to `<body>`, which is disorienting for keyboard and screen-reader users.
10. **Two DOM structures for the documents table**, one hidden by CSS at each breakpoint,
    rather than restyling a `<table>` into blocks. `display: block` on table elements strips
    their row/column semantics; keeping a real table and a real card list leaves the
    accessibility tree honest at both sizes.
11. **The strength meter has no `aria-live`.** It updates on every keystroke, and announcing
    "weak, weak, fair…" while someone types their password is noise. The level is in words
    beside the bar, so it is never colour-only.
12. **The contract illustration is `aria-hidden`.** Its claim is spelled out properly in the
    three value points beside it; reading out a fake document's redacted lines would be noise.
13. **Sample data behind an async loader with real latency**, not an inline constant. It means
    the skeleton, empty and error states are exercised on every visit instead of being
    written once and never seen again.
14. **Dev-only `?demo=` states.** Empty and error states are the ones that rot unnoticed;
    making them reachable by URL keeps them reviewable.
15. **`AuthGate` wraps all routes, public ones included.** `ProtectedRoute` would otherwise
    redirect while `/auth/me` is still in flight, bouncing a signed-in user to login on reload.
16. **Rows that lead nowhere get no hover or pointer affordance.** A row that looks clickable
    but is not is a small lie, and there is nowhere for it to lead until `/documents` exists.
17. **No "Forgot password", "Remember me" or social login.** The backend supports none of
    them; shipping the buttons would be a promise the app cannot keep.
18. **Same-origin API by default, via a Vite proxy.** The alternative — an absolute
    `http://localhost:8000` default — breaks the moment the page is served from anywhere
    other than the dev machine, because `localhost` then means *the viewer's* machine. The
    proxy means one forwarded port instead of two, no tunnel URL in any config file, and no
    CORS surface in development.
19. **Contrast verified numerically, not by eye.** Every text token was computed against every
    surface it is used on; the worst pair is 4.79:1. This caught two real failures during the
    build — muted text on the page background at 4.35:1, and 32px language-toggle targets.

---

## Known gaps

- **The access token is in memory, mirrored to `sessionStorage`**, which is readable by any
  script on the page and therefore exposed to XSS. Moving it to an httpOnly, Secure,
  SameSite cookie plus CSRF protection is the proper fix and belongs with a refresh-token
  design. Carried over from the auth foundation; see the root README.
- **The Urdu copy is unreviewed** — see the note above.
- **No browser-based visual QA was possible** in the environment this was built in: there
  was no Playwright, Claude in Chrome or built-in browser available, so the screenshot pass
  at 375/768/1280 px in both languages has not been done. Layout correctness rests on code
  review, the responsive rules in the stylesheets, and the DOM-level tests. **This is the
  one acceptance item that still needs a human to look at it**, particularly Urdu text
  clipping at `h1` sizes, which is the hardest thing to be sure of without rendering.
- No refresh tokens, so a session ends after the access token's 60 minutes.
- The dashboard is one request; when real endpoints arrive it should become one per widget.
