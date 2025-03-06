import mysql from 'mysql2/promise';

// Create and export the pool configuration
export const pool = mysql.createPool({
  host: 'dedi1350.jnb1.host-h.net',
  user: 'admin',
  password: '8E33U976qa800F',
  database: 'opianrewards',
  port: 3306,
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  maxIdle: 10,
  idleTimeout: 60000
});

// Export the createConnection function for cases where a dedicated connection is needed
export async function createConnection() {
  return await mysql.createConnection({
    host: 'dedi1350.jnb1.host-h.net',
    user: 'admin',
    password: '8E33U976qa800F',
    database: 'opianrewards',
    port: 3306,
    ssl: {
      rejectUnauthorized: false
    }
  });
}