module.exports = {
  apps: [
    {
      name: 'ctnew-api',
      script: 'dist/server/index.js',
      // PM2 will use the directory where you run `pm2 start` as CWD
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        // Set these in your server environment or via PM2 if needed:
        // PORT: '3000',
        // DATABASE_URL: 'postgres://user:password@host:5432/dbname',
        // REDIS_URL: 'redis://redis:6379/0',
        // or use REDIS_HOST / REDIS_PORT / REDIS_PASSWORD instead of REDIS_URL
        // RESUME_MATCH_API: 'http://ec2-3-136-87-20.us-east-2.compute.amazonaws.com:8080/match',
      },
    },
    {
      name: 'ctnew-talent-match-worker',
      script: 'dist/server/workers/talent-job-matching.worker.js',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        // Must be the same Redis + database + match API config as the API:
        // DATABASE_URL: 'postgres://user:password@host:5432/dbname',
        // REDIS_URL: 'redis://redis:6379/0',
        // or REDIS_HOST / REDIS_PORT / REDIS_PASSWORD
        // RESUME_MATCH_API: 'http://ec2-3-136-87-20.us-east-2.compute.amazonaws.com:8080/match',
      },
    },
  ],
};

