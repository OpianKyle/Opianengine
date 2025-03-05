import { sql } from 'drizzle-orm';

export async function up(db: any) {
  // First remove any existing foreign key constraint
  await db.execute(sql`
    ALTER TABLE users 
    DROP FOREIGN KEY IF EXISTS users_agent_id_fkey;
  `);

  // Add the foreign key constraint with proper referential integrity
  await db.execute(sql`
    ALTER TABLE users 
    ADD CONSTRAINT users_agent_id_fkey 
    FOREIGN KEY (agent_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  `);
}

export async function down(db: any) {
  await db.execute(sql`
    ALTER TABLE users 
    DROP FOREIGN KEY IF EXISTS users_agent_id_fkey;
  `);
}
