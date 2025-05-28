/**
 * Clear transaction history table to allow for fresh import with correct amounts
 */
import mysql from 'mysql2/promise';

async function clearTransactionHistory() {
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

    // Clear all transaction history records
    const clearSQL = `DELETE FROM transaction_history`;
    await connection.execute(clearSQL);
    console.log('✅ Successfully cleared transaction_history table');

    // Verify table is empty
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM transaction_history');
    const count = rows[0]?.count || 0;
    console.log(`✅ Table verification: ${count} records remaining`);

  } catch (error) {
    console.error('❌ Error clearing transaction history:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

clearTransactionHistory();