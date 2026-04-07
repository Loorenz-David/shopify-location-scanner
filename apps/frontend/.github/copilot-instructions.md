# Frontend Workspace Contracts

This workspace is frontend-only.

Scope and ownership:

- Focus all implementation on React + TypeScript UI concerns.
- Treat backend as an external contract provider owned by a separate team/agent.
- Never move privileged logic, secrets, or authorization decisions into frontend code.

Architecture rules:

- Use feature-first organization for application code.
- Use a consistent feature folder architecture with: `api/`, `controllers/`, `actions/`, `flows/`, `stores/`, `types/`, `domain/`, `context/`, `providers/`, `ui/`.
- Keep separation clear between view components, hooks, and API client modules.
- `actions/` are the callable interface for UI components and hooks.
- `controllers/` are the boundary layer between `api/`, `domain/`, and `actions/`.
- `flows/` organize render-linked and user-journey logic across actions/controllers.
- UI components in `ui/` are presentational only and never process business logic.
- Use `zustand` as the standard store state management library.
- Keep pages thin: composition, routing context, and high-level wiring only.
- Keep domain logic in hooks or domain services, not in JSX-heavy components.
- Keep request/response contracts explicit and typed, preferably with zod when practical.

Integration rules:

- Frontend must consume backend contracts, not redefine backend business behavior.
- Handle loading, empty, error, and success states in every async view.
- Prefer resilient UX fallbacks over hard crashes when API responses fail.

Security rules:

- Never commit or expose secrets in frontend code.
- Use only safe client env variables intended for browser exposure.
- Never store sensitive tokens in source or logs.

Delivery rules:

- Implement the smallest usable vertical slice first, then iterate.
- Add or update tests whenever behavior changes.
- Keep errors actionable and domain-specific.
- Favor small composable modules and explicit naming.

Planning protocol for new feature requests:

- When the user provides a feature description, first produce a decomposition plan before implementation.
- The plan must map logic ownership to folders: `api/`, `controllers/`, `actions/`, `flows/`, `stores/`, `types/`, `domain/`, `context/`, `providers/`, `ui/`.
- The plan must explicitly list what calls what: UI -> actions -> controllers -> api/domain.
- The plan must identify render-linked logic in `flows/` and state ownership in `stores/`.
- The plan must separate:
  - presentational UI logic (in `ui/` only),
  - orchestration logic (in `flows/` and `controllers/`),
  - contract logic (in `api/` + `types/`),
  - pure domain rules (in `domain/`).
- Do not start coding until this module placement and consumption map is clear.
