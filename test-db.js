// Test script for database connection
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection(port = 3306) {
  try {
    console.log(`Testing database connection on port ${port}...`);
    
    const dbConfig = {
      host: process.env.DB_HOST || 'dedi1350.jnb1.host-h.net',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'opianrewards',
      port: port,
      ssl: {
        rejectUnauthorized: false
      },
      connectTimeout: 10000 // 10 seconds timeout
    };
    
    console.log('Using database config:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port,
      password: dbConfig.password ? 'PRESENT' : 'NOT SET',
    });
    
    const connection = await mysql.createConnection(dbConfig);
    
    console.log('Database connection successful');
    await connection.end();
    return true;
  } catch (dbError) {
    console.error('Database connection test failed:', dbError);
    return false;
  }
}

// Try different ports commonly used for MariaDB/MySQL
async function tryDifferentPorts() {
  // Common MySQL/MariaDB ports
  const ports = [5029, 3310];
  
  console.log('Trying to connect on different ports...');
  
  for (const port of ports) {
    console.log(`\n--- Testing port ${port} ---`);
    const result = await testConnection(port);
    if (result) {
      console.log(`\n✅ SUCCESS! Connection works on port ${port}\n`);
      return true;
    }
  }
  
  console.log('\n❌ Failed to connect on any of the tested ports');
  return false;
}

tryDifferentPorts();