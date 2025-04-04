import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}`);
  dotenv.config(); // Try default locations
}

// Export environment variables
export const {
  NODE_ENV = "development",
  PORT = "5000",
  SESSION_SECRET = "",
  JWT_SECRET = "",
  DB_HOST = "",
  DB_USER = "",
  DB_PASSWORD = "",
  DB_NAME = "",
  DB_PORT = "3306",
  DATABASE_URL = "",
} = process.env;

// Validate critical environment variables
if (!SESSION_SECRET) {
  console.error("SESSION_SECRET is required");
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error("JWT_SECRET is required");
  process.exit(1);
}

// Validate database connection details
if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  if (!DATABASE_URL) {
    console.error("Database connection details are required");
    process.exit(1);
  }
}