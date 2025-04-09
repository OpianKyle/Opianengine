// Script to check a specific user's package using CommonJS
require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkUserPackage() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'opian'
    });
    
    console.log('Connected to database successfully');
    
    // Check user 178's package
    const [users] = await connection.execute(
      'SELECT id, email, first_name, last_name, selected_package FROM users WHERE id = 178'
    );
    
    if (users.length === 0) {
      console.log('User not found');
    } else {
      const user = users[0];
      console.log(`User ID: ${user.id}, Email: ${user.email}, Package: ${user.selected_package}`);
    }
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserPackage();