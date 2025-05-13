/**
 * Create leads table directly using SQL
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function createLeadsTable() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    uri: dbUrl,
  });

  console.log('Connected to database');
  console.log('Creating leads table...');

  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        mobile_number VARCHAR(20) NOT NULL,
        selected_package VARCHAR(50),
        referral_code VARCHAR(50),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'new',
        assigned_agent_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await connection.query(createTableSQL);
    
    // Add indexes
    await connection.query('CREATE INDEX idx_leads_email ON leads(email)');
    await connection.query('CREATE INDEX idx_leads_assigned_agent ON leads(assigned_agent_id)');
    
    console.log('Leads table created successfully!');
  } catch (error) {
    console.error('Failed to create leads table:');
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

createLeadsTable().catch((err) => {
  console.error('Unexpected error:');
  console.error(err);
  process.exit(1);
});