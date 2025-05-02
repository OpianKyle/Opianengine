/**
 * Migration to create the leads table
 * 
 * This migration creates a table to store lead generation data from users interested in the platform
 * but who haven't registered yet. Helps admins track potential customers.
 */

export async function up(db) {
  console.log('Running migration: 0014_create_leads_table (up)');

  try {
    // Check if the leads table already exists
    const [tableCheck] = await db.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'leads'
    `);

    if (tableCheck[0].count > 0) {
      console.log('Leads table already exists, skipping creation');
      return;
    }

    // Create the leads table
    await db.execute(`
      CREATE TABLE leads (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        mobile_number VARCHAR(20) NOT NULL,
        selected_package ENUM('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE'),
        referral_code VARCHAR(100),
        contacted BOOLEAN DEFAULT FALSE,
        converted BOOLEAN DEFAULT FALSE,
        converted_user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (converted_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log('Created leads table successfully');
  } catch (error) {
    console.error('Error creating leads table:', error);
    throw error;
  }
}

export async function down(db) {
  console.log('Running migration: 0014_create_leads_table (down)');

  try {
    // Check if the leads table exists
    const [tableCheck] = await db.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'leads'
    `);

    if (tableCheck[0].count === 0) {
      console.log('Leads table does not exist, nothing to drop');
      return;
    }

    // Drop the leads table
    await db.execute(`DROP TABLE leads`);
    
    console.log('Dropped leads table successfully');
  } catch (error) {
    console.error('Error dropping leads table:', error);
    throw error;
  }
}