import { createConnection } from '../server/db';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

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
    console.log('Generating password hash for "12345678"...');
    // Generate a new bcrypt hash for the password "12345678"
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('12345678', saltRounds);
    console.log('Generated hash:', hashedPassword);
    
    console.log('Resetting password for kylem@opianfsgroup.com...');
    
    // Update the password for the specific email
    const [result] = await connection.execute(
      `UPDATE users 
       SET password = ? 
       WHERE email = ?`,
      [hashedPassword, 'kylem@opianfsgroup.com']
    );
    
    console.log('Password reset result:', result);
    
    // Check if the update was successful
    const [userInfo] = await connection.execute(
      `SELECT id, email, is_super_admin, is_admin FROM users WHERE email = ?`,
      ['kylem@opianfsgroup.com']
    );
    
    console.log('User account information:', userInfo);
    console.log('Password has been reset to "12345678"');
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await connection.end();
  }
}

resetAdminPassword().catch(console.error);