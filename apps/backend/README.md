# shopify-location-scanner

## Admin accounts

Public registration has been removed. On a fresh installation, configure the backend environment and apply Prisma migrations, then run from the repository root:

```sh
npm --prefix apps/backend run setup:admin
```

The command requires an interactive terminal and prompts for a username (3–50 characters) and a masked password (8–128 characters). It refuses to run if an admin already exists or the username is taken. It links the account to an existing connected shop when available; otherwise log in and complete the Shopify integration. Passwords are hashed and never printed.

Admins can then use **Settings → Users → Create user** to create Admin, Manager, Worker, or Seller accounts for their shop. Managers can view their shop’s users and create Worker or Seller accounts. Only admins can create Admin or Manager accounts and change existing users’ roles. Share the initial password with the new user separately. `POST /users` (also `/api/users`) accepts username, password, and role and returns only the user summary.

Release backend and frontend together through the existing deployment workflow. Existing accounts continue to work; no database migration is required for this change. `ADMIN_KEY` is no longer used and may be removed from deployment environment configuration.

Run the admin creation integration checks with `npm --prefix apps/backend run test:users`. They use a disposable SQLite database and a temporary Redis server; `redis-server` and Python 3 must be installed locally.
