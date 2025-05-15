import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Database connection
  const connectionString = process.env.DATABASE_URL;
  
  console.log('Connecting to database...');
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable not found');
    process.exit(1);
  }
  
  try {
    const connection = await mysql.createConnection(connectionString);
    
    // Add suburb and province fields if they don't exist
    console.log('Adding suburb field to users table...');
    await connection.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS suburb TEXT;');
    
    console.log('Adding province field to users table...');
    await connection.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS province TEXT;');
    
    console.log('Migration completed successfully');
    
    // Verify the columns were added
    const [rows] = await connection.execute('SHOW COLUMNS FROM users;');
    console.log('Updated table columns:', rows.map(row => row.Field));
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

main();