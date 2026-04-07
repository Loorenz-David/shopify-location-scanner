# Database Runbook (SQLite + Prisma)

## Local Setup

1. Copy `.env.example` to `.env` in `apps/backend`.
2. Set `DATABASE_URL` to a SQLite file URL (default: `file:./dev.db`).
3. Run migrations:
   - `npm run prisma:migrate:dev`
4. Generate Prisma client if needed:
   - `npm run prisma:generate`

## Migration Workflow

- Every schema change must be committed as a Prisma migration.
- Development:
  - `npm run prisma:migrate:dev -- --name <change-name>`
- Deployment:
  - `npm run prisma:migrate:deploy`

## Runtime

- Backend applies SQLite pragmas at startup:
  - `journal_mode = WAL`
  - `foreign_keys = ON`
- DB health route: `GET /health/db`

## Limitations of SQLite

- Best for single-instance deployments.
- Not ideal for high-write concurrency or multi-instance scaling.
- Plan migration to Postgres before broad public rollout.

## Production on EC2 (SQLite)

### Persistence and Isolation

- Use a single backend instance for SQLite writes.
- Store DB on a persistent EBS-backed directory (for example `/var/lib/item-scanner/data/app.db`).
- Do not keep production SQLite files in the app release folder.
- Restrict DB directory ownership to the backend service user.

### Required Production Env Value

- Set `DATABASE_URL` to an absolute SQLite path:
  - `file:/var/lib/item-scanner/data/app.db`
- Relative SQLite paths are blocked in production by env validation.

### Recommended Deploy Order

1. Install dependencies.
2. Build backend.
3. Apply Prisma migrations (`prisma migrate deploy`).
4. Restart backend service.

Use script:

- `npm run deploy:ec2`

### Backups

- Run regular SQLite logical backups with `.backup` command.
- Use script:
  - `npm run backup:sqlite`
- Store backups on durable storage (for example S3) and define retention policy.
