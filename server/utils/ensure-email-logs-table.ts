import mysql from 'mysql2/promise';

/**
 * Function to check if the email_logs table exists and create it if it doesn't
 */
export async function ensureEmailLogsTable() {
  // Create a connection using the same environment variable-based configuration as the rest of the app
  try {
    console.log('Connecting to MariaDB/MySQL database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'dedi1350.jnb1.host-h.net',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || '@Dm20251Nl@NC3#543321@#',
      database: process.env.DB_NAME || 'opianrewards',
      port: Number(process.env.DB_PORT) || 3306,
      ssl: {
        rejectUnauthorized: false
      }
    });
    console.log('Connected to MariaDB/MySQL successfully');

    // Check if the table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'email_logs'"
    );

    // @ts-ignore - MySQL2 types don't easily handle this case
    if (Array.isArray(tables) && tables.length === 0) {
      console.log('Creating email_logs table...');
      
      // Create the table
      await connection.execute(`
        CREATE TABLE email_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          recipient_email VARCHAR(255) NOT NULL,
          subject VARCHAR(255) NOT NULL,
          html_content TEXT,
          text_content TEXT,
          email_type VARCHAR(50) DEFAULT 'GENERAL',
          status ENUM('SENT', 'FAILED') NOT NULL,
          has_attachments BOOLEAN DEFAULT FALSE,
          error_message TEXT,
          template_data JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      
      console.log('email_logs table created successfully');
    } else {
      console.log('email_logs table already exists');
    }
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('Error ensuring email_logs table:', error);
    return false;
  }
}