/**
 * Migration to create the leads table for lead generation
 * 
 * This migration adds a new table for storing lead information from
 * potential customers who are interested in the rewards program.
 */

export async function up(db) {
  await db.schema
    .createTable("leads")
    .ifNotExists()
    .addColumn("id", "int", (col) => col.primaryKey().autoIncrement())
    .addColumn("first_name", "varchar(255)", (col) => col.notNull())
    .addColumn("last_name", "varchar(255)", (col) => col.notNull())
    .addColumn("email", "varchar(255)", (col) => col.notNull())
    .addColumn("mobile_number", "varchar(20)", (col) => col.notNull())
    .addColumn("selected_package", "varchar(50)")
    .addColumn("referral_code", "varchar(50)")
    .addColumn("notes", "text")
    .addColumn("status", "varchar(50)", (col) => col.defaultTo("new"))
    .addColumn("assigned_agent_id", "int")
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(db.raw("CURRENT_TIMESTAMP")))
    .addColumn("updated_at", "timestamp", (col) => 
      col.defaultTo(db.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")))
    .execute();

  // Add an index for email to make searching faster
  await db.schema
    .alterTable("leads")
    .addIndex("idx_leads_email", ["email"])
    .execute();

  // Add an index for assigned agent to make joins faster
  await db.schema
    .alterTable("leads")
    .addIndex("idx_leads_assigned_agent", ["assigned_agent_id"])
    .execute();
}

export async function down(db) {
  await db.schema.dropTable("leads").ifExists().execute();
}