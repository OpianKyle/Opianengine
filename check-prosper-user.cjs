// Script to check a PROSPER user's package using CommonJS
require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkProperUsers() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'opian'
    });
    
    console.log('Connected to database successfully');
    
    // Query for users with PROSPER, PRESTIGE, or PINNACLE packages
    const [users] = await connection.execute(
      'SELECT id, email, first_name, last_name, selected_package FROM users WHERE selected_package IN ("PROSPER", "PRESTIGE", "PINNACLE") LIMIT 5'
    );
    
    if (users.length === 0) {
      console.log('No users found with eligible packages');
    } else {
      console.log(`Found ${users.length} users with eligible packages:`);
      users.forEach(user => {
        console.log(`ID: ${user.id}, Email: ${user.email}, Package: ${user.selected_package}`);
      });
    }
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkProperUsers();