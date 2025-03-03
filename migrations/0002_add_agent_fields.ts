import { sql } from 'drizzle-orm';
import { mysqlTable, int, boolean } from 'drizzle-orm/mysql-core';

export async function up(db: any) {
  // First add is_agent column
  await db.execute(sql`
    ALTER TABLE users 
    ADD COLUMN is_agent BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  // Then add agent_id column
  await db.execute(sql`
    ALTER TABLE users 
    ADD COLUMN agent_id INT,
    ADD FOREIGN KEY (agent_id) REFERENCES users(id);
  `);
}

export async function down(db: any) {
  // Remove columns in reverse order
  await db.execute(sql`
    ALTER TABLE users 
    DROP COLUMN agent_id,
    DROP COLUMN is_agent;
  `);
}