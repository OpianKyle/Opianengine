import { createConnection } from '../server/db';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up paths and load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env');

// Load environment variables first
console.log('Loading .env from:', envPath);
const result = dotenv.config({
  path: envPath,
  override: true
});

if (result.error) {
  console.error('Failed to load .env file:', result.error);
  process.exit(1);
}

// Log environment variables
console.log('Environment variables loaded:', {
  dbHost: process.env.DB_HOST,
  dbUser: process.env.DB_USER,
  dbName: process.env.DB_NAME,
  hasDbUrl: !!process.env.DATABASE_URL,
  envPath
});

async function resetAdminPassword() {
  console.log('Connecting to database...');
  const connection = await createConnection();
  try {
    console.log('Resetting super admin password...');
    
    // Update the password for the super admin
    const [result] = await connection.execute(
      `UPDATE users 
       SET password = ? 
       WHERE is_super_admin = 1`,
      ['$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS']
    );
    
    console.log('Password reset result:', result);
    console.log('Password reset successful');
    
    // Check if the admin exists
    const [admins] = await connection.execute(
      `SELECT id, email, is_super_admin, is_admin FROM users WHERE is_super_admin = 1`
    );
    
    console.log('Super admin accounts:', admins);
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await connection.end();
  }
}

resetAdminPassword().catch(console.error);
