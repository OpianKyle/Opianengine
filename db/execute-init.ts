import { readFile } from 'fs/promises';
import mysql from 'mysql2/promise';
import path from 'path';

async function executeInitScript() {
  try {
    console.log('Starting database initialization...');
    
    // Read the SQL file
    const sqlFile = await readFile(path.join(__dirname, 'init.sql'), 'utf8');
    
    // Split into individual queries (split on semicolon followed by newline)
    const queries = sqlFile
      .split(';\n')
      .filter(query => query.trim().length > 0);
    
    // Create connection
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

    console.log('Connected to database. Executing queries...');

    // Execute each query sequentially
    for (const query of queries) {
      try {
        await connection.query(query);
        console.log('Successfully executed query:', query.substring(0, 50) + '...');
      } catch (error) {
        console.error('Error executing query:', query.substring(0, 100));
        console.error('Error details:', error);
        throw error; // Re-throw to stop execution
      }
    }

    console.log('All queries executed successfully');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

executeInitScript();
