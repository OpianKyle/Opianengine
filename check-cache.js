// Check if there's a cache in memory store
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkMemoryStore() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || process.env.DB_HOST,
    user: process.env.MYSQL_USER || process.env.DB_USER,
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME,
    port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
  });
  
  try {
    // Check if sessions table exists
    const tablesQuery = `
      SHOW TABLES LIKE 'sessions';
    `;
    
    const [tablesResult] = await connection.execute(tablesQuery);
    
    if (tablesResult.length > 0) {
      console.log('Sessions table exists, checking for cache entries');
      
      // Look for cache entries in sessions table
      const sessionsQuery = `
        SELECT * FROM sessions 
        WHERE data LIKE '%agent-commissions%'
        OR data LIKE '%cache%';
      `;
      
      const [sessionsResult] = await connection.execute(sessionsQuery);
      console.log('Found session entries with cache data:', sessionsResult.length);
      
      if (sessionsResult.length > 0) {
        // Sample the first one
        console.log('Sample session data:', sessionsResult[0].data ? sessionsResult[0].data.substring(0, 200) + '...' : 'No data');
      }
    } else {
      console.log('No sessions table found in database');
    }
    
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await connection.end();
  }
}

checkMemoryStore();
