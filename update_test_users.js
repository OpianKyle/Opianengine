// Script to mark test users in the database
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function markTestUsers() {
  console.log('Starting to mark test users...');
  
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    // First check if any test users exist
    const [initialCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE is_test = TRUE'
    );
    console.log(`Initial test users count: ${initialCount[0].count}`);
    
    // Update users with test in their email as test users
    const [testEmailResult] = await connection.execute(
      "UPDATE users SET is_test = TRUE WHERE email LIKE '%test%@%' OR email LIKE '%@testuser.com' OR email LIKE '%@testemail.com' OR email LIKE '%@example.com'"
    );
    console.log(`Updated ${testEmailResult.affectedRows} users with test emails`);
    
    // Also update users with "test" in their name as test users
    const [testNameResult] = await connection.execute(
      "UPDATE users SET is_test = TRUE WHERE first_name LIKE '%test%' OR last_name LIKE '%test%'"
    );
    console.log(`Updated ${testNameResult.affectedRows} users with test in their name`);
    
    // Final count
    const [finalCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE is_test = TRUE'
    );
    console.log(`Final test users count: ${finalCount[0].count}`);
    
  } catch (error) {
    console.error('Error marking test users:', error);
  } finally {
    if (connection) await connection.end();
  }
}

markTestUsers().then(() => console.log('Done'));
