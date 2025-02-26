import mysql from 'mysql2/promise';

export async function createConnection() {
  return await mysql.createConnection({
    user: 'admin',
    host: 'dedi1350.jnb1.host-h.net',
    password: '8E33U976qa800F',
    database: 'opianrewards',
  });
}