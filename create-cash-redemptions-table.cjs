/**
 * Create a dedicated cash redemptions table
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createCashRedemptionsTable() {
  console.log('Creating cash_redemptions table...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    // Create the cash_redemptions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS cash_redemptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        points INT NOT NULL,
        cash_amount DECIMAL(10, 2) NOT NULL,
        transaction_id INT,
        status ENUM('PENDING', 'PROCESSED') DEFAULT 'PENDING',
        processed_at DATETIME,
        processed_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (processed_by) REFERENCES users(id),
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
      )
    `);
    
    console.log('✅ Cash redemptions table created successfully');
  } catch (error) {
    console.error('❌ Error creating cash redemptions table:', error);
  } finally {
    await connection.end();
  }
}

// Execute the function
(async () => {
  try {
    await createCashRedemptionsTable();
    console.log('Script completed');
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
})();