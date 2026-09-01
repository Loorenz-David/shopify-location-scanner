# Context — Frontend architecture the stock feature must follow

Grounded against the real tree on 2026-09-01. All paths relative to `apps/frontend/`.

## 1. Stack

- React 19 + TypeScript, Vite 8, Tailwind CSS v4 (via `@tailwindcss/vite`, imported once in `src/index.css`).
- State: **zustand 5** (`create()` stores + exported selector functions). No redux, no react-query.
- Animation: **framer-motion 12** (overlay transitions).
- Charts: recharts (analytics only). Virtual lists: `@tanstack/react-virtual`.
- **No URL router.** Navigation is store-driven (see §3).
- **No test runner is installed** — `package.json` has no vitest/jest and no `test` script. Scripts: `dev`, `typecheck` (`tsc -b`), `build`, `lint`, `preview`.

## 2. Feature-module layered architecture

Every feature lives in `src/features/<feature>/` with this layer split (see
`features/logistic-locations/` as the cleanest complete example):

| layer | role | example |
|---|---|---|
| `types/` | `*.dto.ts` wire shapes, `*.types.ts` view/domain types | `logistic-locations.dto.ts` |
| `api/` | one file per endpoint, thin typed call through the shared client | `create-logistic-location.api.ts` |
| `domain/` | pure functions (normalize, filter, derive) — no IO, no store | `logistic-locations.domain.ts` |
| `stores/` | zustand store + selectors | `logistic-locations.store.ts` |
| `controllers/` | orchestration: api + domain + store writes, optimistic updates, error strings | `logistic-locations.controller.ts` |
| `actions/` | imperative facade the UI calls; may drive home-shell navigation | `logistic-locations.actions.ts` |
| `flows/` | React hooks binding lifecycle/WS events to controllers | `use-logistic-locations.flow.ts` |
| `ui/` | pages + components (Tailwind classes inline; no CSS modules) | `LogisticLocationsSettingsPage.tsx` |

Naming conventions are strict and kebab-cased: `get-x.api.ts`, `x.controller.ts`,
`x.actions.ts`, `use-x.flow.ts`, `x.store.ts`, `x.domain.ts`, PascalCase `ui/` components.

Shared, feature-agnostic UI lives in `src/share/` (`SearchBar`, `InfoSheet`, `MiniMarkdown`).
Icons are SVGR components in `src/assets/icons/` (existing: `FilterIcon`, `BackArrowIcon`,
`CloseIcon`, `WriteIcon`, `TriangleWarningIcon`, …; new icons are added there and exported
from its `index.ts`).

## 3. Navigation — the home shell

- `App.tsx` handles auth/session, then renders `features/home/HomeFeature.tsx`.
- `HomeFeature` declares a **page registry** (`registeredPages` array): each page has an
  `id`, `title`, `component`, optional `bottomMenu` (label/icon/slot/order/visible) and
  optional `presentation: "full-overlay"`.
- Plain pages render inside `PageOutlet` **with the bottom tab bar visible**; pages with
  `presentation: "full-overlay"` slide in over everything (including the tab bar) via
  `FullFeatureOverlayContainer` (`fixed inset-0 z-50`, framer-motion x-slide).
- Navigation is performed with `homeShellActions.selectNavigationPage(pageId)`
  (see `features/home/actions/home-shell.actions.ts`); "back" is a call to
  `selectNavigationPage("settings")` — see `LocationsSettingsPage.tsx:58`.
- Heavy pages are **lazy chunks**: `features/home/lazy-pages.tsx` wraps
  `import()` in `createLazyFeaturePage` (Suspense + error boundary + retry). Any new
  settings sub-page must be registered the same way.
- Settings sub-pages are wired in **three places**: a row in
  `features/settings/domain/settings-options.domain.ts` (`settingsOptionSubscriptions`),
  a lazy component in `lazy-pages.tsx`, and a registry entry in `HomeFeature.tsx`
  (existing ids follow the pattern `settings-locations`, `settings-users`, …).
- Multi-screen flows *inside* a feature (wizard steps, detail push) are not shell pages —
  features keep internal view state in their own store/context (the shell has no nested
  router). Bottom sheets/popups use the shell's `SlidingOverlayContainer`/`PopupContainer`
  patterns or a feature-local equivalent (see `share/info/InfoSheet.tsx` for the
  sheet-over-dimmed-content idiom).

## 4. HTTP client — fetch wrapper, not axios

`src/core/api-client/` exports a singleton `apiClient` built by `createApiClient()`
(`actions/api-client.action.ts`). It is a **fetch-based** wrapper (the backend handoff
says "same axios client" — the contract means "the existing shared client"; there is no
axios in this repo). Behavior:

- `apiClient.get/post/put/patch/delete<TResponse, TPayload>(endpoint, payload?, options?)`.
- Bearer JWT injected automatically (`tokenAuthController`), transparent refresh + one
  retry on 401, session-expired propagation.
- Non-2xx throws `ApiClientError { status, endpoint, method, data }` — `data` carries the
  parsed backend error envelope (`{ error: { code, message, details, requestId } }` for
  the stock API). 409 conflict handling reads `error.data`.
- **Endpoints are passed WITHOUT the `/api` prefix**, and there is no dev-server proxy.
  *(Corrected 2026-09-01 — the previous sentence here, "absolute paths (`/api/stock/...`);
  Vite dev server proxies", was false in both halves.)* `createApiClient` prepends
  `VITE_API_BASE_URL` (`src/core/api-client/index.ts:4` → `buildRequestUrl`,
  `actions/api-client.action.ts:175`), and that base **already ends in `/api`**
  (`.env`: `http://192.168.1.246:4000/api`). Verified against the tree: of every endpoint
  literal passed to `apiClient` across `src/`, **zero** begin with `/api` — the convention
  is `/auth/login`, `/bootstrap`, `/zones`, `/logistic/get-location`,
  `/shopify/metafields/options`, … `vite.config.ts` defines no `server.proxy`, and needs
  none: the base URL is absolute.
  **Reading a backend contract:** contract paths like `GET /api/stock/options` describe the
  *server* path. The `apiClient` argument is that path minus `/api` — `/stock/options`.
  Passing it verbatim produces `…:4000/api/api/stock/options`, which no mock-mode test can
  observe and which surfaces only against a live backend.

## 5. Realtime — WS client

- `src/core/ws-client/`: `useWsEvent(type, handler)` hook; inbound event union in
  `ws-events.ts`. **`scan_history_updated` already exists** in `WsInboundEvent`.
- The refetch idiom to copy is `features/analytics/flows/use-analytics-page.flow.ts:138-142`:
  ignore the payload, call the flow's `load()`. The stock report and location detail
  must do exactly this (per backend contract §5). Configuration changes emit no event.

## 6. Bootstrap — where locations come from

- `features/bootstrap/` hydrates once after login (`bootstrapActions.hydrate()` in
  `App.tsx`), storing `BootstrapPayloadDto` in `useBootstrapStore`.
- **Valid shop locations = `payload.shopify.metafields.options`** — an array of
  `{ label, value }` where label and value are the same plain string (e.g. `"LC1"`).
  There is **no zone/aisle display name anywhere in the data** — a location is just its
  code string. (The design mockups show `L1 · Aisle A`; the data can only supply `L1`.)
- `logisticLocations` in the bootstrap are a *different* concept (delivery/pickup/fixing
  zones) — not the stock locations.

## 7. Error/loading/optimistic conventions

- Controllers set `isLoading` / `errorMessage` strings in the store; UI renders a rose
  banner (`rounded-xl border-rose-300 bg-rose-100 …`) and pulse-skeleton placeholders
  (see `LocationsSettingsPage.tsx`).
- Optimistic create/delete with rollback on failure is the established pattern
  (`logistic-locations.controller.ts`). For the stock API, note the backend computes
  real initial quantities on create — the POST response is authoritative, so a plain
  pending state (not optimistic quantities) fits better; after PATCH/DELETE the whole
  location detail must be refetched (sibling reallocation, contract §4.5/§4.6).

## 8. Facts worth flagging to planning

- No test infrastructure exists in the frontend today — owner decided (intention §9 D8)
  this project adds vitest + React Testing Library, domain-layer coverage first.
- PDF: `@react-pdf/renderer@^4.9.0` is installed (see `pdf-library.md` beside this file).
- No URL router: deep-linking into stock screens is impossible without shell changes —
  matches how every other settings area already behaves.
- `dist/` is committed build output; never edit it.
