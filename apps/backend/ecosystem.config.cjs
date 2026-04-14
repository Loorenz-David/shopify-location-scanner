module.exports = {
  apps: [
    {
      name: "shopify-backend",
      script: "./dist/src/server.js",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
      },
    },
    {
      name: "shopify-webhook-worker",
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
  ],
};
