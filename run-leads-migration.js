/**
 * Run the migration to create leads table
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { up, down } from './migrations/0014_create_leads_table.js';

dotenv.config();

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const poolConnection = await mysql.createPool({
    uri: dbUrl,
  });

  console.log('Connected to database');
  console.log('Running leads table migration...');

  try {
    const db = drizzle(poolConnection);
    await up(db);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await poolConnection.end();
  }
}

main().catch((err) => {
  console.error('Unexpected error:');
  console.error(err);
  process.exit(1);
});