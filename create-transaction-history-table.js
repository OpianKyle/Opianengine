/**
 * Create transaction_history table in MySQL database
 */
import mysql from 'mysql2/promise';

async function createTransactionHistoryTable() {
  let connection;
  
  try {
    // Use the same connection details from your db/index.ts
    connection = await mysql.createConnection({
      host: 'dedi1350.jnb1.host-h.net',
      user: 'admin',
      password: '8E33U976qa800F',
      database: 'opianrewards',
      port: 3306,
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('Connected to MySQL database');

    // Create transaction_history table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS transaction_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        transaction_type ENUM('DEBIT', 'CREDIT') NOT NULL,
        amount INT NOT NULL COMMENT 'Amount in cents',
        description TEXT,
        merchant_name TEXT,
        merchant_category TEXT,
        transaction_date TIMESTAMP,
        statement_date TIMESTAMP,
        points_earned INT DEFAULT 0 NOT NULL,
        import_batch_id TEXT,
        raw_data TEXT COMMENT 'Store original transaction data as JSON',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_transaction_date (transaction_date),
        INDEX idx_import_batch_id (import_batch_id),
        INDEX idx_transaction_type (transaction_type),
        INDEX idx_merchant_category (merchant_category)
      ) ENGINE=InnoDB;
    `;

    await connection.execute(createTableSQL);
    console.log('✅ Successfully created transaction_history table');

    // Verify table was created
    const [rows] = await connection.execute('SHOW TABLES LIKE "transaction_history"');
    if (rows.length > 0) {
      console.log('✅ Table verification successful');
    } else {
      console.log('❌ Table verification failed');
    }

  } catch (error) {
    console.error('❌ Error creating transaction_history table:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the script
createTransactionHistoryTable()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });