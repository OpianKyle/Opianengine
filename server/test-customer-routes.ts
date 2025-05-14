/**
 * This file provides a separate implementation of the test customer generation route
 * to avoid conflicts with the main routes.ts file
 */
import { Express, Request, Response } from "express";
import { checkAdmin } from "./auth";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Generate test customers with South African data
export function registerTestCustomerRoutes(app: Express) {
  app.post("/api/admin/generate-test-customers", checkAdmin, async (req: Request, res: Response) => {
    const { count = 10 } = req.body;
    const adminId = req.user?.id;
    
    if (!adminId) {
      return res.status(401).json({ error: "Admin authentication required" });
    }

    // Limit the number of customers that can be generated at once
    const safeCount = Math.min(Math.max(parseInt(count.toString()) || 10, 1), 100);
    
    // Connect to database
    let connection;
    try {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "opian",
      });
      
      // Begin transaction
      await connection.beginTransaction();
      
      const customers = [];
      
      // Generate South African names
      const firstNames = [
        "Thabo", "Sipho", "Nomsa", "Lerato", "Mandla", "Ntombi", "Sibusiso", "Themba", 
        "Precious", "Blessing", "Grace", "Hope", "Zanele", "Nkosi", "Bongani", "Thandi",
        "Nkosinathi", "Lungile", "Andile", "Busisiwe", "Sfiso", "Thulani", "Nosipho", "Zinhle"
      ];
      
      const lastNames = [
        "Dlamini", "Nkosi", "Ndlovu", "Zuma", "Mthembu", "Khumalo", "Sibiya", "Mkhize",
        "Ncube", "Mokoena", "Tshabalala", "Molefe", "Mashaba", "Sithole", "Mabena", "Mahlangu",
        "Cele", "Buthelezi", "Zwane", "Mhlongo", "Mthethwa", "Shabangu", "Radebe", "Phiri"
      ];
      
      // South African cities
      const cities = [
        "Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein",
        "East London", "Nelspruit", "Polokwane", "Kimberley", "Rustenburg", "Pietermaritzburg",
        "Soweto", "Centurion", "Randburg", "Benoni", "Boksburg", "Welkom", "Vereeniging", "Potchefstroom"
      ];
      
      // Generate test customers with package types
      const packageTypes = ["OPPORTUNITY", "MOMENTUM", "PROSPER", "PRESTIGE", "PINNACLE"];
      
      for (let i = 0; i < safeCount; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const email = generateEmail(firstName, lastName);
        const phoneNumber = generatePhoneNumber();
        const city = cities[Math.floor(Math.random() * cities.length)];
        const packageType = packageTypes[Math.floor(Math.random() * packageTypes.length)];
        const registrationDate = getRandomDate();
        
        // Create user
        const hashedPassword = await hashPassword("test123");
        const [userResult] = await connection.execute(
          // Note: No username or updated_at column in users table
          "INSERT INTO users (email, password, first_name, last_name, phone_number, city, created_at, card_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [email, hashedPassword, firstName, lastName, phoneNumber, city, registrationDate, "REQUESTED"]
        );
        
        // @ts-ignore - TypeScript doesn't recognize insertId property
        const userId = userResult.insertId;
        
        // Update user's package type instead of creating a separate customer record (no customers table exists)
        await connection.execute(
          "UPDATE users SET selected_package = ? WHERE id = ?",
          [packageType, userId]
        );
        
        // Initialize points balance (random between 0-5000)
        const initialPoints = Math.floor(Math.random() * 5000);
        if (initialPoints > 0) {
          await connection.execute(
            "INSERT INTO transactions (user_id, points, type, description, created_at) VALUES (?, ?, ?, ?, ?)",
            [userId, initialPoints, "ADMIN_ADJUSTMENT", "Initial points balance", registrationDate]
          );
        }
        
        customers.push({
          id: userId,
          firstName,
          lastName,
          email,
          phoneNumber,
          city,
          packageType,
          registrationDate,
          initialPoints
        });
      }
      
      // Commit transaction
      await connection.commit();
      
      res.status(200).json({ 
        success: true, 
        message: `Successfully generated ${safeCount} test customers`,
        customers 
      });
      
    } catch (error) {
      console.error("Error generating test customers:", error);
      
      // Rollback transaction if there was an error
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error("Error rolling back transaction:", rollbackError);
        }
      }
      
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate test customers",
        details: error instanceof Error ? error.message : String(error)
      });
    } finally {
      // Close connection
      if (connection) {
        try {
          await connection.end();
        } catch (err) {
          console.error("Error closing database connection:", err);
        }
      }
    }
  });
}

// Helper functions
function getRandomDate() {
  // Generate random date in the last 2 years
  const now = new Date();
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(now.getFullYear() - 2);
  
  const randomTimestamp = twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime());
  return new Date(randomTimestamp).toISOString().slice(0, 19).replace('T', ' ');
}

function generatePhoneNumber() {
  // South African mobile numbers typically start with 07, 06, or 08
  const prefixes = ["07", "06", "08"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  let number = prefix;
  
  // Add 8 more random digits
  for (let i = 0; i < 8; i++) {
    number += Math.floor(Math.random() * 10);
  }
  
  return number;
}

function generateEmail(firstName: string, lastName: string) {
  // Generate a somewhat realistic email address
  const domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "opian.co.za", "webmail.co.za"];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  
  // Add a random number to ensure uniqueness
  const randomNum = Math.floor(Math.random() * 1000);
  
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@${domain}`.replace(/\s/g, "");
}

async function hashPassword(password: string) {
  const salt = Math.random().toString(36).substring(2, 15);
  return `${password}|${salt}`; // Simplified for test data - real system uses scrypt
}