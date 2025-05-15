import { mysqlTable } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable("users", {});

// Add suburb and province fields to users table
export async function up(db) {
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS suburb TEXT;`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS province TEXT;`);
  console.log('Added suburb and province fields to users table');
  return { success: true };
}

// Create down migration to remove these fields if needed
export async function down(db) {
  await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS suburb;`);
  await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS province;`);
  console.log('Removed suburb and province fields from users table');
  return { success: true };
}