// pm2 ecosystem config for Amber daemon
module.exports = {
  apps: [{
    name: 'amber',
    script: 'daemon.js',
    cwd: '/Users/bart/Documents/code/vibeceo/amber-daemon',
    
    // Restart policy
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
    
    // Logging
    error_file: '~/.amber/logs/error.log',
    out_file: '~/.amber/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    
    // Environment
    env: {
      NODE_ENV: 'production',
    },
    
    // Watch for changes (disable in prod)
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
  }]
};
