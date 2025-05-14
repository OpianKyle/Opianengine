/**
 * This script updates the passwords for all existing test customers
 * to use the correct hashing method compatible with the auth system
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

const main = async () => {
  // Connect to database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "opian",
  });
  
  try {
    console.log('Starting password update...');
    
    // Get test customers (users with email containing 'opian.co.za')
    const [users] = await connection.execute(
      "SELECT id, email FROM users WHERE email LIKE '%opian.co.za%'"
    );
    
    if (!users.length) {
      console.log('No test customers found.');
      return;
    }
    
    console.log(`Found ${users.length} test customers to update.`);
    
    // Generate the standard password hash
    const standardPassword = 'Password123!';
    const passwordHash = await hashPassword(standardPassword);
    
    // Update each user
    for (const user of users) {
      await connection.execute(
        "UPDATE users SET password = ? WHERE id = ?",
        [passwordHash, user.id]
      );
      console.log(`Updated password for ${user.email} (ID: ${user.id})`);
    }
    
    console.log('Password update completed successfully!');
    console.log(`All test customers can now log in with password: ${standardPassword}`);
  } catch (error) {
    console.error('Error updating passwords:', error);
  } finally {
    await connection.end();
  }
}

main().catch(err => console.error('Error:', err));