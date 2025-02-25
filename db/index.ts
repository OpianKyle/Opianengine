import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@db/schema";

const poolConnection = mysql.createPool({
  host: 'dedi1350.jnb1.host-h.net',
  user: 'admin',
  password: '8E33U976qa800F',
  database: 'opianrewards',
  port: 3306,
  ssl: {
    rejectUnauthorized: false
  }
});

export const db = drizzle(poolConnection, { schema, mode: 'default' });