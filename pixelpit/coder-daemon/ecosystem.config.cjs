module.exports = {
  apps: [
    {
      name: 'pit-daemon',
      script: 'daemon.js',
      cwd: __dirname,
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'pit-discord',
      script: 'discord-bot.js',
      cwd: __dirname,
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
