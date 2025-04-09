// Script to check user's package
import { config } from 'dotenv';
import { createConnection } from 'mysql2/promise';

config();

async function checkUserPackage() {
  try {
    const connection = await createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('Connected to database successfully');
    
    // Query user data
    const [users] = await connection.execute(
      'SELECT id, email, first_name, last_name, selected_package FROM users WHERE id = ?',
      [178]
    );
    
    if (users.length === 0) {
      console.log('User not found');
    } else {
      console.log('User data:', users[0]);
    }
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserPackage();