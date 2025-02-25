import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = './backups';
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

  try {
    console.log('Starting database backup...');

    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true });

    // Create database connection
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

    // Get all tables
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(table => Object.values(table)[0]);

    let backupContent = '';

    // For each table
    for (const tableName of tableNames) {
      console.log(`Backing up table: ${tableName}`);

      // Get create table statement
      const [createTable] = await connection.query(`SHOW CREATE TABLE ${tableName}`);
      backupContent += createTable[0]['Create Table'] + ';\n\n';

      // Get table data
      const [rows] = await connection.query(`SELECT * FROM ${tableName}`);

      if (rows.length > 0) {
        // Generate INSERT statements
        const columns = Object.keys(rows[0]);
        const values = rows.map(row => 
          `(${columns.map(col => 
            typeof row[col] === 'string' ? 
              `'${row[col].replace(/'/g, "''")}'` : 
              row[col] === null ? 
                'NULL' : 
                row[col]
          ).join(', ')})`
        );

        if (values.length > 0) {
          backupContent += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n`;
          backupContent += values.join(',\n') + ';\n\n';
        }
      }
    }

    // Write backup to file
    await fs.writeFile(backupFile, backupContent, 'utf8');

    await connection.end();

    console.log(`Database backup completed successfully. Backup saved to: ${backupFile}`);
    return true;
  } catch (error) {
    console.error('Backup failed:', error);
    return false;
  }
}

backupDatabase()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });