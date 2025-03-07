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

    // Test notifications table
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Current tables in database:', tables);

    const [notificationsSchema] = await connection.execute('DESCRIBE notifications');
    console.log('Notifications table schema:', notificationsSchema);

    // Test a simple query to check notifications
    const [notifications] = await connection.execute('SELECT COUNT(*) as count FROM notifications');
    console.log('Total notifications in database:', notifications[0].count);

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