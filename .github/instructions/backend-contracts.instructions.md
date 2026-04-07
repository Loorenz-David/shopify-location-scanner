---
applyTo: "apps/backend/**/*.ts"
description: "Use when creating or editing backend routes, controllers, services, repositories, and integrations. Enforces backend architecture and API contracts."
---

# Backend Contracts

## Core Principles (Non-Negotiable)

- Enforce single responsibility per module, function, and class.
- Keep business rules framework-agnostic and testable in isolation.
- Prefer explicit contracts over implicit behavior.
- Make invalid states unrepresentable through typed schemas and DTOs.

## Layering and Dependency Direction

- Route modules: path registration and middleware composition only.
- Controllers: HTTP translation only (parse input, call service, map output).
- Services: business rules and orchestration only.
- Repositories: persistence operations only.
- Integrations: external systems only (Shopify APIs, webhooks, third-party APIs).
- Allowed dependency direction: route -> controller -> service -> repository/integration.
- Forbidden dependency direction: repository to service/controller, service to route/controller.
- Controllers must never import repository modules directly.

## Service Organization (Commands / Queries / Domain)

- Service code should be organized by feature module, then by responsibility.
- Preferred feature structure:
  - src/modules/<feature>/commands: write use-cases and state-changing orchestration.
  - src/modules/<feature>/queries: read use-cases and projection assembly.
  - src/modules/<feature>/domain: pure business rules, entities, value objects, domain services, and domain errors.
  - src/modules/<feature>/contracts: input and output DTO schemas and types.
- Command handlers must not perform read-model formatting for UI concerns.
- Query handlers must not mutate state.
- Domain layer must remain framework-agnostic and side-effect free.
- Repositories and integrations are dependencies of commands and queries, never of domain entities.
- Shared rules used by both commands and queries must be extracted to domain.
- One file should implement one use-case or one domain concept where practical.

## SRP Rules by Layer

- Route modules must not contain business logic.
- Controllers must not include branching business rules beyond HTTP concerns.
- Services must not read raw Express request or write Express response.
- Repositories must not implement domain decisions (only data access semantics).
- Integration clients must not leak transport-specific response shapes to services.

## Contracts and Validation

- Validate params, query, and body with zod before entering service logic.
- Define request and response DTOs explicitly; do not return ORM entities directly.
- Centralize environment parsing and validation at startup; fail fast on invalid env.
- Shared cross-layer contracts should be typed and imported from a single contract module.

## Error Handling

- Use a typed error model with stable `code`, `message`, and optional `details`.
- Map domain/integration errors to HTTP responses in controllers or error middleware only.
- Do not leak stack traces or internal provider payloads to clients.
- Use global error middleware for final response formatting.

## Runtime Error Pipeline (Mandatory)

- Requests must pass through request context middleware that sets a request identifier.
- Async controllers and route handlers must forward errors to global middleware.
- Business and domain failures should throw typed `AppError` subclasses.
- Global error middleware is the single place that maps errors to HTTP responses.
- Unknown errors must map to a sanitized 500 response.
- Process-level handlers must log `unhandledRejection` and `uncaughtException`.
- All error responses must include a stable error code and request identifier.

## Transactions and Data Consistency

- Transaction boundaries belong in services, not controllers or repositories.
- Group dependent write operations in a single transaction when atomicity is required.
- Design write flows to be idempotent when retries are possible.

## Prisma Architecture

- Prisma schema is the single source of truth for physical database models and relations.
- Define and update database tables in `apps/backend/prisma/schema.prisma` only.
- Use Prisma migrations for every schema change; do not apply manual production schema edits.
- Prisma client access is restricted to repository modules.
- Controllers, commands, queries, and domain modules must not call Prisma client directly.
- Repositories must map Prisma records to domain models and DTOs; do not leak raw Prisma models across layers.
- Keep migration files in version control and review them as part of code review.
- Use service-level orchestration for multi-repository transactions and pass transactional clients into repositories when needed.
- Avoid embedding business rules in Prisma queries; keep business decisions in commands/domain.
- Keep Prisma client creation centralized in a shared database module (for example `src/shared/database/prisma-client.ts`).
- Apply runtime DB initialization (for example SQLite pragmas) during server bootstrap before accepting traffic.
- Expose a lightweight DB health endpoint and use it for readiness checks.
- Keep `DATABASE_URL` validated in environment schema and fail startup on missing/invalid values.

## Security

- Keep secrets and tokens server-only.
- Never serialize credentials into logs, API responses, or thrown errors.
- Restrict CORS to explicit, environment-driven origin allowlists.
- Validate and verify all external callbacks (for example webhook signatures) before processing.

## Observability

- Log at integration boundaries with correlation identifiers when available.
- Include contextual fields needed for debugging (shop, route, operation, error code).
- Never log secrets, full access tokens, or raw sensitive payloads.

## API Design and Versioning

- Keep endpoints resource-oriented, predictable, and backward-safe.
- Use consistent success and error envelope shapes across endpoints.
- Introduce additive changes first; avoid breaking response shape without versioning.

## Testing Requirements

- Service layer requires unit tests for business rules and edge cases.
- Controllers require integration-style tests for validation and error mapping.
- Repository tests should verify query behavior that contains non-trivial logic.
- For behavior changes, update or add tests in the same change set.
