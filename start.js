#!/usr/bin/env node
console.log('Starting server with minimal setup...');

// Use tsx to run TypeScript files directly
const { exec } = require('child_process');

// Start the server with the fastest possible options
exec('npx tsx --no-warnings server/index.ts', {
  stdio: 'inherit'
}, (error) => {
  if (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
});

console.log('Server starting...');