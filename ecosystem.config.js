module.exports = {
    apps: [
        {
            name: 'muggi-web',
            script: 'npm',
            args: 'start',
            cwd: process.cwd(),
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G'
        },
        {
            name: 'wara-node',
            script: 'npm',
            args: 'start',
            cwd: process.cwd() + '/wara-lib',
            env: {
                NODE_ENV: 'production'
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M'
        },
        {
            name: 'wara-tracker',
            script: 'npm',
            args: 'start',
            cwd: process.cwd() + '/wara-tracker',
            env: {
                NODE_ENV: 'production'
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '256M'
        }
    ]
};
