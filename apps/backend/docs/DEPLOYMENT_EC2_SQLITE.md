# EC2 Deployment Runbook (Backend + SQLite)

## Scope

Production deployment for backend on a single EC2 instance with SQLite persistence.

## Architecture

- Single backend instance (Node.js + Express)
- SQLite database stored on EBS-backed persistent disk
- systemd service for process supervision
- Optional Nginx reverse proxy + TLS

## 1) Prepare Host

Install required packages:

```bash
sudo apt update
sudo apt install -y nodejs npm sqlite3 nginx
```

Create app user and persistent DB path:

```bash
sudo useradd --system --create-home --shell /bin/bash itemscanner || true
sudo mkdir -p /var/lib/item-scanner/data
sudo chown -R itemscanner:itemscanner /var/lib/item-scanner
sudo chmod 750 /var/lib/item-scanner/data
```

## 2) Environment

Copy and populate production env file:

```bash
cp apps/backend/.env.production.example apps/backend/.env
```

Important values:

- `DATABASE_URL=file:/var/lib/item-scanner/data/app.db`
- `FRONTEND_URL=https://your-frontend-domain.com`
- `SHOPIFY_APP_URL=https://your-frontend-domain.com`
- `BACKEND_PUBLIC_URL=https://api.your-domain.com`

Shopify callback URL must exactly be:

- `https://api.your-domain.com/api/shopify/oauth/callback`

Notes:

- `SHOPIFY_APP_URL` is the browser-facing embedded app URL.
- `BACKEND_PUBLIC_URL` is the backend base URL used for OAuth callback and webhook registration.
- Managed webhook callback URLs must resolve under the backend domain.

## 3) Deploy

From backend directory:

```bash
npm run deploy:ec2
```

This script:

1. installs dependencies,
2. runs `prisma generate`,
3. builds backend,
4. runs `prisma migrate deploy`,
5. restarts service.

### GitHub Actions Deployment

The repository now includes `.github/workflows/deploy-ec2.yml` for automated EC2 deploys on
push to `main` and manual `workflow_dispatch`.

Required GitHub repository secrets:

- `EC2_HOST` - public DNS name or IP of the EC2 instance
- `EC2_PORT` - SSH port, usually `22`
- `EC2_USER` - SSH user on the instance
- `EC2_SSH_KEY` - private key used by GitHub Actions to SSH into the instance
- `EC2_REPO_PATH` - absolute path to the checked-out repository on EC2
- `EC2_BACKEND_ENV_FILE` - optional override for backend env file path
- `EC2_KNOWN_HOSTS` - optional pinned host key entry; preferred over runtime `ssh-keyscan`

The workflow SSHes into the instance and runs `apps/backend/scripts/deploy-ec2.sh`, which now:

1. refuses to deploy from a dirty EC2 worktree,
2. fetches and hard-resets to the remote branch head,
3. builds backend and frontend before downtime,
4. stops PM2 apps only just before Prisma migrations,
5. reloads the PM2 ecosystem,
6. verifies PM2 process state and `/health` + `/health/db`.

## 4) systemd Service

Create `/etc/systemd/system/item-scanner-backend.service`:

```ini
[Unit]
Description=Item Scanner Backend
After=network.target

[Service]
Type=simple
User=itemscanner
Group=itemscanner
WorkingDirectory=/opt/item-scanner/apps/backend
EnvironmentFile=/opt/item-scanner/apps/backend/.env
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable item-scanner-backend
sudo systemctl start item-scanner-backend
sudo systemctl status item-scanner-backend --no-pager
```

## 5) Reverse Proxy (Nginx)

Route HTTPS traffic to backend `localhost:4000`.

Ensure proxy preserves querystring for Shopify callback path.

## 6) Backups

Run manual backup:

```bash
npm run backup:sqlite
```

Automate with cron (example: every 6 hours):

```bash
0 */6 * * * cd /opt/item-scanner/apps/backend && /usr/bin/npm run backup:sqlite >> /var/log/item-scanner-backup.log 2>&1
```

## 7) Health Verification

- `GET /health`
- `GET /health/db`

Both should return success after deploy.

## 8) Operating Constraints

- Do not run multiple backend instances against same SQLite DB.
- Keep DB path on persistent disk, not release directory.
- Before scaling beyond single instance or heavy write load, migrate to Postgres.
