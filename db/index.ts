import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@db/schema";
import { pool } from '../server/db';  // Import pool from server/db.ts

// Create and export the drizzle instance with the pool connection
export const db = drizzle(pool, { 
  schema,
  mode: 'default'
});

// Re-export the pool for direct queries if needed
export { pool };