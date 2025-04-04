import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define top-level exports with default values
let SESSION_SECRET: string = '';
let JWT_SECRET: string = '';
let DB_HOST: string = '';
let DB_USER: string = '';
let DB_PASSWORD: string = '';
let DB_NAME: string = '';
let DB_PORT: string = '3306';
let DATABASE_URL: string | undefined = undefined;

// Load environment variables silently
dotenv.config({
  path: path.resolve(__dirname, '..', '.env'),
  override: true
});

// Apply defaults or use environment values
SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-temporary-session-secret-for-development-only';
JWT_SECRET = process.env.JWT_SECRET || 'fallback-temporary-jwt-secret-for-development-only';
DB_HOST = process.env.DB_HOST || process.env.PGHOST || 'localhost';
DB_USER = process.env.DB_USER || process.env.PGUSER || 'root';
DB_PASSWORD = process.env.DB_PASSWORD || process.env.PGPASSWORD || '';
DB_NAME = process.env.DB_NAME || process.env.PGDATABASE || 'opian';
DB_PORT = process.env.DB_PORT || process.env.PGPORT || '3306';
DATABASE_URL = process.env.DATABASE_URL;

// Export the variables
export {
  SESSION_SECRET,
  JWT_SECRET,
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_PORT,
  DATABASE_URL,
};
