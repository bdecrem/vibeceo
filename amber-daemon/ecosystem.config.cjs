// pm2 ecosystem config for Amber daemon + Discord bot
module.exports = {
  apps: [
    {
      name: 'amber-daemon',
      script: 'daemon.js',
      cwd: __dirname,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      error_file: '~/.amber/logs/daemon-error.log',
      out_file: '~/.amber/logs/daemon-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      env: { NODE_ENV: 'production' },
      watch: false,
    },
    {
      name: 'amber-discord',
      script: 'discord-bot.js',
      cwd: __dirname,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      error_file: '~/.amber/logs/discord-error.log',
      out_file: '~/.amber/logs/discord-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      env: { NODE_ENV: 'production' },
      watch: false,
    },
  ]
};
