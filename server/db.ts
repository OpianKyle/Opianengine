import mysql from 'mysql2/promise';

export async function createConnection() {
  try {
    const connection = await mysql.createConnection({
      host: 'dedi1350.jnb1.host-h.net',
      user: 'admin',
      password: '8E33U976qa800F',
      database: 'opianrewards',
      port: 3306,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Test the connection
    await connection.query('SELECT 1');
    console.log('Successfully connected to MariaDB');

    // Create admin_logs table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        target_user_id INT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id),
        FOREIGN KEY (target_user_id) REFERENCES users(id),
        INDEX idx_admin_id (admin_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Admin logs table created/verified');

    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Failed to connect to database');
  }
}