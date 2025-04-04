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

// Load dotenv configuration explicitly before importing the application
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if .env file exists (prevents errors if no .env file in production)
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log(`No .env file found at ${envPath}, using existing environment variables`);
}

// Log environment variables for debugging (without showing values)
console.log('Environment configuration:');
console.log(`- Database: ${process.env.DB_HOST ? 'CONFIGURED' : 'MISSING'}`);
console.log(`- JWT Secret: ${process.env.JWT_SECRET ? 'CONFIGURED' : 'MISSING'}`);
console.log(`- Session Secret: ${process.env.SESSION_SECRET ? 'CONFIGURED' : 'MISSING'}`);
console.log(`- SMTP: ${process.env.SMTP_HOST ? 'CONFIGURED' : 'MISSING'}`);

// Load the compiled application
console.log('RENDER DEPLOYMENT: Loading built application from dist/index.js');
import('./dist/index.js');