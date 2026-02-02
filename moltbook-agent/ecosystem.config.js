// PM2 Ecosystem Configuration for SuperRouter Moltbook Agent

module.exports = {
  apps: [{
    name: 'SuperRouter',
    script: 'dist/index.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    exp_backoff_restart_delay: 100,

    env: {
      NODE_ENV: 'development',
    },
    env_production: {
      NODE_ENV: 'production',
    },

    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    merge_logs: true,

    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
  }]
};
