import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import * as schema from "./schema";
import fs from 'fs/promises';
import path from 'path';

const runMigration = async () => {
  try {
    console.log('Starting database migration...');

    // Ensure migrations directory exists
    const migrationsDir = path.join(process.cwd(), 'migrations');
    try {
      await fs.mkdir(migrationsDir, { recursive: true });
    } catch (err) {
      console.log('Migrations directory already exists');
    }

    const poolConnection = mysql.createPool({
      host: 'dedi1350.jnb1.host-h.net',
      user: 'admin',
      password: '8E33U976qa800F',
      database: 'opianrewards',
      port: 3306,
      ssl: {
        rejectUnauthorized: false
      }
    });

    const db = drizzle(poolConnection, { schema, mode: 'default' });

    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('Migrations completed successfully');

    await poolConnection.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();