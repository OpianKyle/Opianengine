import mysql from 'mysql2/promise';

export async function createConnection() {
  try {
    // Create the connection with explicit configuration
    const connection = await mysql.createConnection({
      host: 'dedi1350.jnb1.host-h.net',
      user: 'admin',
      password: '8E33U976qa800F',
      database: 'opianrewards',
      port: 3306,
      ssl: {
        rejectUnauthorized: false
      },
      // Add connection configuration
      dateStrings: true,
      typeCast: function (field: any, next: any) {
        if (field.type === 'BIT') {
          return field.buffer()[0] === 1;
        }
        return next();
      }
    });

    // Test the connection
    await connection.query('SELECT 1');
    console.log('Successfully connected to MariaDB');
    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Failed to connect to database');
  }
}