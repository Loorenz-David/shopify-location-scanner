module.exports = {
  apps: [
    {
      name: "shopify-backend",
      cwd: __dirname,
      script: "./dist/src/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "5s",
      env_production: {
        NODE_ENV: "production",
      },
    },
    {
      name: "shopify-webhook-worker",
      cwd: __dirname,
      script: "./dist/src/workers/webhook-worker.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "5s",
      env_production: {
        NODE_ENV: "production",
      },
    },
    {
      name: "shopify-notification-worker",
      cwd: __dirname,
      script: "./dist/src/workers/notification-worker.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "5s",
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
