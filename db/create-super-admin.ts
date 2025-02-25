import { db } from './index';
import { users } from './schema';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

async function createSuperAdmin() {
  try {
    console.log('Creating super admin account...');

    // Create direct database connection for verification
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

    // Verify connection
    console.log('Testing database connection...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Connected successfully. Available tables:', tables);

    // Default super admin credentials
    const hashedPassword = await bcrypt.hash('Admin@123', 12);

    // Use direct SQL insertion
    const insertQuery = `
      INSERT INTO users (
        email, password, first_name, last_name, 
        phone_number, is_admin, is_super_admin, 
        is_enabled, points, created_at
      ) 
      VALUES (
        'admin@opianrewards.com', 
        ?, 
        'Super', 
        'Admin', 
        '0000000000',
        1,
        1,
        1,
        0,
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        password = VALUES(password),
        is_admin = VALUES(is_admin),
        is_super_admin = VALUES(is_super_admin),
        is_enabled = VALUES(is_enabled);
    `;

    console.log('Executing insert query...');
    const [insertResult] = await connection.execute(insertQuery, [hashedPassword]);
    console.log('Insert result:', insertResult);

    // Verify the insertion
    console.log('Verifying super admin creation...');
    const [rows] = await connection.execute(
      'SELECT id, email, first_name, last_name, is_admin, is_super_admin, is_enabled FROM users WHERE email = ?',
      ['admin@opianrewards.com']
    );
    console.log('Verification query result:', rows);

    if (Array.isArray(rows) && rows.length > 0) {
      console.log('Super admin account created successfully');
      console.log('Email:', 'admin@opianrewards.com');
      console.log('Password: Admin@123');
      console.log('Please change the password after first login');
    } else {
      throw new Error('Failed to verify super admin creation');
    }

    await connection.end();
    return true;
  } catch (error) {
    console.error('Failed to create super admin:', error);
    return false;
  }
}

createSuperAdmin()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });