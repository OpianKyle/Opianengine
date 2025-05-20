/**
 * Run the migration to create cash wallet tables
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Running cash wallet tables migration...');
  
  // Create a database connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'opianrewards',
    multipleStatements: true // Important for running multiple SQL statements
  });

  try {
    // Read the migration SQL file
    const sqlPath = path.join(__dirname, 'migrations', 'add_cash_wallet_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split and execute each statement separately for better error reporting
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
          await connection.execute(statement);
          console.log('Statement executed successfully');
        } catch (error) {
          console.error(`Error executing statement: ${statement.trim().substring(0, 100)}...`);
          console.error(error.message);
          // Continue with other statements
        }
      }
    }
    
    console.log('Cash wallet tables migration completed successfully');
  } catch (error) {
    console.error('Failed to run migration:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);