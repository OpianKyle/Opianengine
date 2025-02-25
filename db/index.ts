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

let db: ReturnType<typeof drizzle>;

(async () => {
  try {
    const connection = await connectWithRetry();
    db = drizzle(connection, { schema, mode: 'default' });
  } catch (error) {
    console.error('Failed to establish database connection:', error);
    process.exit(1);
  }
})();

export { db };