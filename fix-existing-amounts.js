/**
 * Fix existing transaction amounts that were incorrectly multiplied by 100
 */
import mysql from 'mysql2/promise';

async function fixExistingAmounts() {
  let connection;
  
  try {
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

    // First, let's check what amounts we have that are likely wrong (> 1000)
    const [wrongAmounts] = await connection.execute(`
      SELECT id, merchant_name, amount, description 
      FROM transaction_history 
      WHERE amount > 1000 
      ORDER BY amount DESC
    `);
    
    console.log('Found transactions with potentially wrong amounts:');
    wrongAmounts.forEach(row => {
      console.log(`ID: ${row.id}, Merchant: ${row.merchant_name}, Amount: ${row.amount} (will become ${row.amount / 100})`);
    });

    if (wrongAmounts.length > 0) {
      // Fix amounts by dividing by 100 for transactions over 1000
      const updateSQL = `
        UPDATE transaction_history 
        SET amount = ROUND(amount / 100) 
        WHERE amount > 1000
      `;
      
      const [result] = await connection.execute(updateSQL);
      console.log(`✅ Fixed ${result.affectedRows} transaction amounts`);
      
      // Verify the fix
      const [fixedAmounts] = await connection.execute(`
        SELECT merchant_name, amount, description 
        FROM transaction_history 
        WHERE merchant_name LIKE '%Mozambik%'
        LIMIT 5
      `);
      
      console.log('Mozambik transactions after fix:');
      fixedAmounts.forEach(row => {
        console.log(`Merchant: ${row.merchant_name}, Amount: ${row.amount}`);
      });
    } else {
      console.log('No amounts need fixing');
    }

  } catch (error) {
    console.error('❌ Error fixing amounts:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

fixExistingAmounts();