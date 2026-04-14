#!/usr/bin/env bash

set -euo pipefail


pm2 stop shopify-backend

npm install
npx prisma generate
npm run build
npx prisma migrate deploy
pm2 restart shopify-backend

