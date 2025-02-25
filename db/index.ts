import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@db/schema";

// Set the database URL for MariaDB
const dbUrl = process.env.DATABASE_URL || "mysql://admin:8E33U976qa800F@dedi1350.jnb1.host-h.net:3306/opianrewards";

if (!dbUrl) {
  throw new Error(
    "DATABASE_URL, ensure the database is provisioned",
  );
}

const connectWithRetry = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting to connect to database (attempt ${i + 1}/${retries})...`);
      const connection = await mysql.createConnection({
        uri: dbUrl,
        connectTimeout: 20000, // 20 seconds
        ssl: {
          rejectUnauthorized: false
        }
      });
      console.log('Successfully connected to database');
      return connection;
    } catch (error) {
      console.error(`Connection attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, i), 10000)));
    }
  }
  throw new Error('Failed to connect to database after multiple attempts');
};

// Initialize database connection
const initializeDb = async () => {
  try {
    const connection = await connectWithRetry();
    return drizzle(connection, { schema, mode: 'default' });
  } catch (error) {
    console.error('Failed to establish database connection:', error);
    throw error;
  }
};

// Export the database initialization promise
export const dbPromise = initializeDb();

// For backward compatibility, also export a lazy-loaded db instance
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    return new Proxy(() => {}, {
      apply: async (target, thisArg, args) => {
        const dbInstance = await dbPromise;
        return (dbInstance as any)[prop](...args);
      },
      get: async (target, innerProp) => {
        const dbInstance = await dbPromise;
        return (dbInstance as any)[prop][innerProp];
      }
    });
  }
});