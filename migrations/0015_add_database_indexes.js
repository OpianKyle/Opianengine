/**
 * Migration to add database indexes for better performance
 * 
 * This migration adds indexes to commonly queried fields in various tables
 * to improve query performance, especially for the leads management page.
 */

export async function up(db) {
  console.log('Adding performance optimization indexes...');
  
  // Add indexes for leads table
  await db.execute(`CREATE INDEX idx_leads_created_at ON leads(created_at)`);
  await db.execute(`CREATE INDEX idx_leads_status ON leads(status)`);
  await db.execute(`CREATE INDEX idx_leads_assigned_agent_id ON leads(assigned_agent_id)`);
  await db.execute(`CREATE INDEX idx_leads_selected_package ON leads(selected_package)`);
  await db.execute(`CREATE INDEX idx_leads_search ON leads(first_name, last_name, email, mobile_number)`);
  
  // Add indexes for users table
  await db.execute(`CREATE INDEX idx_users_email ON users(email)`);
  await db.execute(`CREATE INDEX idx_users_is_agent ON users(is_agent)`);
  await db.execute(`CREATE INDEX idx_users_agent_id ON users(agent_id)`);
  await db.execute(`CREATE INDEX idx_users_referral_code ON users(referral_code)`);
  await db.execute(`CREATE INDEX idx_users_created_at ON users(created_at)`); // For sorting
  await db.execute(`CREATE INDEX idx_users_customer_query ON users(is_agent, created_at)`); // For customers API
  
  // Add indexes for admin_users table 
  await db.execute(`CREATE INDEX idx_admin_users_user_id ON admin_users(user_id)`);
  
  // Add indexes for product_assignments table
  await db.execute(`CREATE INDEX idx_product_assignments_user_id ON product_assignments(user_id)`);
  await db.execute(`CREATE INDEX idx_product_assignments_product_id ON product_assignments(product_id)`);
  
  // Add indexes for transactions table
  await db.execute(`CREATE INDEX idx_transactions_type ON transactions(type)`);
  await db.execute(`CREATE INDEX idx_transactions_created_at ON transactions(created_at)`);
  await db.execute(`CREATE INDEX idx_transactions_user_id ON transactions(user_id)`);
  await db.execute(`CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at)`);
  
  // Add indexes for product_activities table
  await db.execute(`CREATE INDEX idx_product_activities_product_id ON product_activities(product_id)`);
  
  // Add indexes for rewards table
  await db.execute(`CREATE INDEX idx_rewards_available ON rewards(available)`);
  
  console.log('Indexes added successfully');
}

export async function down(db) {
  console.log('Removing performance optimization indexes...');
  
  // Remove indexes from leads table
  await db.execute(`DROP INDEX IF EXISTS idx_leads_created_at ON leads`);
  await db.execute(`DROP INDEX IF EXISTS idx_leads_status ON leads`);
  await db.execute(`DROP INDEX IF EXISTS idx_leads_assigned_agent_id ON leads`);
  await db.execute(`DROP INDEX IF EXISTS idx_leads_selected_package ON leads`);
  await db.execute(`DROP INDEX IF EXISTS idx_leads_search ON leads`);
  
  // Remove indexes from users table
  await db.execute(`DROP INDEX IF EXISTS idx_users_email ON users`);
  await db.execute(`DROP INDEX IF EXISTS idx_users_is_agent ON users`);
  await db.execute(`DROP INDEX IF EXISTS idx_users_agent_id ON users`);
  await db.execute(`DROP INDEX IF EXISTS idx_users_referral_code ON users`);
  await db.execute(`DROP INDEX IF EXISTS idx_users_created_at ON users`);
  await db.execute(`DROP INDEX IF EXISTS idx_users_customer_query ON users`);
  
  // Remove indexes from admin_users table
  await db.execute(`DROP INDEX IF EXISTS idx_admin_users_user_id ON admin_users`);
  
  // Remove indexes from product_assignments table
  await db.execute(`DROP INDEX IF EXISTS idx_product_assignments_user_id ON product_assignments`);
  await db.execute(`DROP INDEX IF EXISTS idx_product_assignments_product_id ON product_assignments`);
  
  // Remove indexes from transactions table
  await db.execute(`DROP INDEX IF EXISTS idx_transactions_type ON transactions`);
  await db.execute(`DROP INDEX IF EXISTS idx_transactions_created_at ON transactions`);
  await db.execute(`DROP INDEX IF EXISTS idx_transactions_user_id ON transactions`);
  await db.execute(`DROP INDEX IF EXISTS idx_transactions_user_created ON transactions`);
  
  // Remove indexes from product_activities table
  await db.execute(`DROP INDEX IF EXISTS idx_product_activities_product_id ON product_activities`);
  
  // Remove indexes from rewards table
  await db.execute(`DROP INDEX IF EXISTS idx_rewards_available ON rewards`);
  
  console.log('Indexes removed successfully');
}