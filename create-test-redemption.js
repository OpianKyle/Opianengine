/**
 * Create a test cash redemption entry
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function createTestRedemption() {
  console.log('Creating test cash redemption entry...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    // Find admin user to use as test user
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE is_admin = 1 LIMIT 1'
    );
    
    if (users.length === 0) {
      console.error('No admin user found to use for testing');
      return;
    }
    
    const userId = users[0].id;
    
    // Check if cash_redemptions table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'cash_redemptions'"
    );
    
    if (tables.length === 0) {
      console.error('cash_redemptions table does not exist, run create-cash-redemptions-table.cjs first');
      return;
    }
    
    // Create a test cash redemption entry
    await connection.execute(
      `INSERT INTO cash_redemptions 
       (user_id, points, cash_amount, status, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, -5000, 500, 'PENDING']
    );
    
    console.log('✅ Test cash redemption created successfully');
    
    // Check if it was added
    const [redemptions] = await connection.execute(
      'SELECT * FROM cash_redemptions ORDER BY created_at DESC LIMIT 1'
    );
    
    console.log('Latest redemption:', redemptions[0]);
  } catch (error) {
    console.error('❌ Error creating test cash redemption:', error);
  } finally {
    await connection.end();
  }
}

// Execute the function
(async () => {
  try {
    await createTestRedemption();
    console.log('Script completed');
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
})();