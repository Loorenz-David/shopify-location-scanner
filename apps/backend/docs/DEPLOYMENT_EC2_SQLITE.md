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
- `SHOPIFY_APP_URL=https://api.your-domain.com`
- `FRONTEND_URL=https://your-frontend-domain.com`

Shopify callback URL must exactly be:

- `https://api.your-domain.com/shopify/oauth/callback`

## 3) Deploy

From backend directory:

```bash
npm run deploy:ec2
```

This script:

1. installs dependencies,
2. builds backend,
3. runs `prisma migrate deploy`,
4. restarts service.

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
