---
applyTo: "src/**/*.{ts,tsx}"
description: "Use when creating or editing React UI, hooks, state, and API clients in the frontend workspace. Enforces scalable architecture and integration contracts."
---

# Frontend Engineering Contract

## 1) Architectural Boundaries

- Keep UI rendering, state orchestration, and data access separated.
- Never place API calls directly in page-level JSX components.
- Keep privileged business logic in backend; frontend performs presentation and UX validations only.
- Prefer feature-first modules with explicit domain naming.

## 2) Recommended Module Layout

Inside each feature, prefer this shape:

- `api/`: HTTP clients, request builders, response adapters.
- `controllers/`: Boundary layer between `api/`, `domain/`, and `actions/`; no direct JSX rendering.
- `actions/`: UI-callable interface for feature intents (submit, scan, sync, retry).
- `flows/`: Organized render-linked flow logic and user-journey progression built from actions/controllers.
- `stores/`: Zustand stores, selectors, and store-local state transitions.
- `types/`: Public feature types, DTOs, and shared TypeScript contracts.
- `domain/`: Domain rules, mappers, and pure business helpers safe for frontend.
- `context/`: React contexts for dependency wiring or cross-tree feature configuration.
- `providers/`: Provider composition wrappers for stores, query clients, and feature bootstrapping.
- `ui/`: Presentational components only; consume props/selectors and never process business logic.
- `tests/`: Unit and integration tests for the feature.

If a feature grows, split by sub-domain before creating cross-feature shared abstractions.

## 3) Data Contracts and API Discipline

- Treat backend responses as strict contracts, never as loose objects.
- Validate or narrow unknown API payloads before UI consumption, preferably with zod.
- Keep request/response types colocated with API client modules.
- Normalize API errors into a stable UI error shape before rendering.

## 4) State Management Rules

- Server state and client state must be managed separately.
- Use `zustand` for store-based client state management.
- Keep each store scoped to a feature domain and expose typed selectors.
- Keep async side effects outside UI components; trigger through actions/controllers/hooks.
- Keep derived state computed, not duplicated.
- Use local component state by default; elevate only when needed by multiple siblings.
- Avoid global state for transient UI state that can remain local.

## 4.1) UI Component Purity

- Components under `ui/` must be presentation-only.
- `ui/` components can read prepared props/selectors and call `actions/`, but must not execute domain orchestration.
- No API calls, no workflow branching, and no business rule evaluation inside `ui/` components.

## 4.2) Flow Layer Rules

- `flows/` coordinate render-time and interaction-time sequences across multiple actions.
- Use flows to model multi-step journeys and state transitions visible in UI.
- Keep flows deterministic and testable; place side effects behind actions/controllers boundaries.

## 5) UI Reliability and UX States

Every async screen and action must explicitly support:

- Loading: Skeleton or progress indicator.
- Empty: Informative neutral state.
- Error: Actionable recovery path (retry, edit input, or navigate).
- Success: Clear completion feedback when user action occurs.

## 6) Performance and Scalability

- Keep components small and memoize only when profiling indicates value.
- Avoid expensive computations during render; move to memoized selectors/hooks.
- Code-split route-level bundles and heavy optional UI blocks.
- Prevent unnecessary re-renders by stabilizing props and callbacks in hot paths.

## 7) Accessibility and Design Quality

- Use semantic HTML first; ARIA only when semantics are insufficient.
- Ensure keyboard navigation and visible focus for all interactive controls.
- Maintain sufficient contrast and readable type scale.
- Keep empty/error/loading visuals consistent across features.

## 8) Security and Configuration

- Never store secrets, private keys, or sensitive tokens in frontend code.
- Use only browser-safe environment variables.
- Avoid logging sensitive payloads in production builds.

## 9) Testing Requirements

- Add or update tests when behavior changes.
- Prefer unit tests for hooks, mappers, and pure utilities.
- Add integration tests for feature flows with async data states.
- Cover at least one negative path for each critical API interaction.

## 10) Delivery and Change Management

- Implement the smallest functional vertical slice first.
- Keep pull requests scoped by feature outcome, not by file type.
- Favor explicit names and low-complexity modules over clever abstractions.
- Add concise comments only where intent is non-obvious.

## 11) Feature Intake and Planning Contract

When the user provides a new feature description, create a planning artifact before coding.

### 11.1 Required Input Breakdown

Extract and confirm these items from the request:

- Goal: What user outcome is being added.
- Entry points: Which screens/components trigger this feature.
- Backend dependencies: Which endpoints/contracts are required.
- UX states: Loading, empty, error, success, and retries.
- Constraints: Performance, accessibility, validation, and security.

### 11.2 Required Planning Output Format

Output the plan in this order:

- Feature summary (1-3 lines).
- Vertical slices (MVP first, then increments).
- Module placement map (folder-by-folder responsibilities).
- Consumption map (who calls whom).
- Data/state lifecycle (fetch -> normalize -> store -> render -> mutate).
- Test plan (unit + integration, including negative paths).
- Risks and assumptions.

### 11.3 Module Placement Map Rules

For every meaningful logic unit, place it in one folder only:

- `types/`: Domain types, DTOs, request/response contracts, zod schemas.
- `api/`: HTTP transport, endpoint functions, response parsing/adapters.
- `domain/`: Pure rules and mappers with no framework dependencies.
- `controllers/`: Boundary layer combining api + domain outputs into action-ready behavior.
- `actions/`: The callable interface used by UI/hooks to trigger feature intents.
- `flows/`: Render-linked and journey-level orchestration across multiple actions/controllers.
- `stores/`: Zustand state, selectors, and local state transitions.
- `context/`: Feature-specific dependency/context wiring.
- `providers/`: Composition wrappers for context/store bootstrapping.
- `ui/`: Presentation-only components; receives prepared data/handlers.

### 11.4 Consumption Graph Rules

Use this dependency direction by default:

- `ui/` -> `actions/` (and selectors from `stores/`).
- `actions/` -> `controllers/`.
- `controllers/` -> `api/` + `domain/` (+ `types/`).
- `flows/` -> `actions/` + `stores/` (may observe render context).
- `stores/` may be updated by actions/flows, never by raw UI business logic.

Disallow reverse coupling unless explicitly justified.

### 11.5 Render-Linked Logic Classification

Classify logic as:

- Render flow logic: belongs in `flows/`.
- User intent execution: belongs in `actions/`.
- Integration transformation: belongs in `controllers/`.
- View formatting only: belongs in `ui/`.

If uncertain, default to keeping orchestration out of UI.

### 11.6 State Design Checklist (Zustand)

For each store, define:

- Store scope (feature/local/global).
- Source of truth fields.
- Derived selectors.
- Mutating actions and side-effect boundaries.
- Reset strategy for route changes/session changes.

### 11.7 Implementation Gate

Do not implement files until:

- Every logic block has a folder owner.
- Call direction is explicit.
- Async states and failure paths are mapped.
- Test targets are listed.
