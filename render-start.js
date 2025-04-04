#!/usr/bin/env node

/**
 * Special startup script for Render deployment
 * Forces the port to be 10000 as required by Render
 */

// Force the environment to be production
process.env.NODE_ENV = 'production';

// Force the port to be 10000 for Render
process.env.PORT = 10000;

console.log('RENDER DEPLOYMENT: Starting server with the following environment:');
console.log(`Node version: ${process.version}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT}`);

// Import dotenv and then our main application
import 'dotenv/config';

// Load the compiled application
console.log('RENDER DEPLOYMENT: Loading built application from dist/index.js');
import('./dist/index.js');