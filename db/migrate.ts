import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "./schema";

async function runMigration() {
  try {
    console.log('Starting database migration...');

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

    // Initialize drizzle with mode parameter
    const db = drizzle(poolConnection, { 
      schema, 
      mode: 'default',
      logger: true 
    });

    // Migration SQL queries
    const migrationQueries = [
      // Add new columns first
      `ALTER TABLE notifications
       ADD COLUMN sender_id INT,
       ADD COLUMN metadata TEXT,
       ADD FOREIGN KEY (sender_id) REFERENCES users(id);`,

      // Update enum type with new values
      `ALTER TABLE notifications 
       MODIFY COLUMN type ENUM(
         'POINTS_AWARDED',
         'POINTS_DEDUCTED',
         'ADMIN_MESSAGE',
         'SYSTEM_UPDATE',
         'QUOTE_STATUS_CHANGE',
         'CUSTOMER_ASSIGNED',
         'CUSTOMER_REMOVED',
         'PRODUCT_ASSIGNED',
         'PRODUCT_REMOVED'
       ) NOT NULL;`
    ];

    console.log('Running migrations...');
    for (const query of migrationQueries) {
      try {
        await poolConnection.query(query);
        console.log('Successfully executed query:', query.substring(0, 100) + '...');
      } catch (error) {
        // Log the full error details for debugging
        console.error('Error executing query:', query);
        console.error('Error details:', error);
        throw error;
      }
    }

    console.log('Migration completed successfully');
    await poolConnection.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();