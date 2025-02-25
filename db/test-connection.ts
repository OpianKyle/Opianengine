import mysql from 'mysql2/promise';

async function testConnection() {
  console.log('Testing database connection...');
  
  const config = {
    host: 'dedi1350.jnb1.host-h.net',
    user: 'admin',
    password: '8E33U976qa800F',
    database: 'opianrewards',
    port: 3306,
    ssl: {
      rejectUnauthorized: false
    }
  };

  try {
    console.log('Attempting to connect to database with config:', {
      ...config,
      password: '[REDACTED]'
    });
    
    const connection = await mysql.createConnection(config);
    console.log('Successfully connected to database');
    
    // Test a simple query
    const [result] = await connection.execute('SHOW TABLES');
    console.log('Current tables in database:', result);
    
    await connection.end();
    console.log('Connection closed successfully');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

testConnection()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
