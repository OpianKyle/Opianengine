import config from './config';
import mysql from 'mysql2/promise';

async function testDatabaseConnection() {
  console.log('Starting database connection test...');
  console.log('Database configuration:', {
    host: config.dbConfig.host,
    port: config.dbConfig.port,
    database: config.dbConfig.database,
    user: config.dbConfig.user,
    hasPassword: !!config.dbConfig.password,
    ssl: !!config.dbConfig.ssl
  });

  try {
    console.log('Attempting to create connection...');
    const connection = await mysql.createConnection({
      ...config.dbConfig,
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('Connection created, testing with query...');
    const [result] = await connection.query('SELECT 1 as test');
    console.log('Test query result:', result);

    await connection.end();
    console.log('Database connection test successful!');
    return true;
  } catch (error) {
    console.error('Database connection test failed:');
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } else {
      console.error('Unknown error:', error);
    }
    return false;
  }
}

// Run the test
testDatabaseConnection()
  .then(success => {
    if (!success) {
      console.log('Database connection test failed. Please check the logs above.');
      process.exit(1);
    }
    console.log('All database tests passed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error during database testing:', error);
    process.exit(1);
  });