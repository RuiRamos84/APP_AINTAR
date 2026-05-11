module.exports = {
  apps: [
    {
      name:         'aintar-whatsapp',
      script:       'index.js',
      watch:        false,
      restart_delay: 5000,
      max_restarts:  10,
      env: {
        WA_PORT:    '3010',
        WA_API_KEY: 'aintar-wa-2025',
        NODE_ENV:   'production',
      },
    },
  ],
};
