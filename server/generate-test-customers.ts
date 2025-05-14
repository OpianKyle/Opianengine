/**
 * This file contains a fixed implementation of the generate-test-customers endpoint
 * 
 * To use this:
 * 1. Import this file in server/routes.ts
 * 2. Call the generateTestCustomers function in the /api/admin/generate-test-customers endpoint
 */
import { Request, Response } from 'express';
import { PoolConnection } from 'mysql2/promise';
import { createSelectSchema } from 'drizzle-zod';

interface GenerateTestCustomersOptions {
  numCount: number;
  packageType?: string;
  customFirstName?: string;
  customLastName?: string;
}

export const PACKAGE_TYPES = [
  "OPPORTUNITY",
  "MOMENTUM",
  "PROSPER", 
  "PRESTIGE",
  "PINNACLE"
];

export const CARD_STATUS = ["NOT_DELIVERED", "OUT_FOR_DELIVERY", "DELIVERED"];

export async function generateTestCustomers(
  req: Request, 
  res: Response, 
  connection: PoolConnection,
  options: GenerateTestCustomersOptions
): Promise<void> {
  const { numCount, packageType, customFirstName, customLastName } = options;
  
  // Data for generating random customers
  const firstNames = customFirstName ? [customFirstName] : [
    'Thabo', 'Sipho', 'Lerato', 'Nomsa', 'Bongani', 'Khaya', 'Mandla', 'Nomvula', 
    'Themba', 'Lindiwe', 'Sibusiso', 'Nkosazana', 'Ayanda', 'Zanele', 'Blessing', 
    'Lethabo', 'Mpho', 'Thandi', 'Ntokozo', 'Nhlanhla'
  ];
  
  const lastNames = customLastName ? [customLastName] : [
    'Nkosi', 'Dlamini', 'Ndlovu', 'Mkhize', 'Khumalo', 'Sithole', 'Zuma', 'Vilakazi', 
    'Mabaso', 'Tshabalala', 'Ngubane', 'Ngcobo', 'Radebe', 'Sibiya', 'Mokoena', 
    'Mthembu', 'Buthelezi', 'Mhlongo', 'Zwane', 'Molefe'
  ];
  
  const southAfricanCities = [
    'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 
    'East London', 'Pietermaritzburg', 'Polokwane', 'Nelspruit', 'Kimberley', 'Rustenburg', 
    'Soweto', 'Benoni', 'Tembisa', 'Boksburg', 'Krugersdorp', 'Soshanguve', 'George', 'Stellenbosch'
  ];
  
  const cardStatuses = CARD_STATUS;
  const packages = packageType ? [packageType] : PACKAGE_TYPES;
  
  // Package prices in Rand
  const packagePrices: { [key: string]: number } = {
    "OPPORTUNITY": 350,
    "MOMENTUM": 450,
    "PROSPER": 550,
    "PRESTIGE": 650,
    "PINNACLE": 750
  };
  
  // Utility functions
  const getRandomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };
  
  const getRandomDate = () => {
    const start = new Date(2023, 0, 1);
    const end = new Date();
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };
  
  const generateMobileNumber = () => {
    const prefixes = ['060', '061', '062', '063', '064', '065', '066', '067', '068', '071', '072', '073', '074', '076', '078', '079', '081', '082', '083', '084'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNumbers = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return randomPrefix + randomNumbers;
  };
  
  const generateEmail = (firstName: string, lastName: string) => {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'opianrewards.com'];
    const randomDomain = domains[Math.floor(Math.random() * domains.length)];
    
    const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
    
    const randomNum = Math.floor(Math.random() * 1000);
    
    return `${cleanFirst}.${cleanLast}${randomNum}@${randomDomain}`;
  };
  
  const hashPassword = async (password: string): Promise<string> => {
    // Use native Node.js crypto module with dynamic imports
    const crypto = await import('crypto');
    const util = await import('util');
    
    const scryptAsync = util.promisify(crypto.scrypt);
    const salt = crypto.randomBytes(16).toString('hex');
    const buf = await scryptAsync(password, salt, 64) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
  };

  // Check if admin_logs table exists before logging action
  try {
    const [adminLogsTable] = await connection.execute("SHOW TABLES LIKE 'admin_logs'");
    
    if (adminLogsTable && (adminLogsTable as any[]).length > 0) {
      // Log action in admin_logs
      await connection.execute(
        "INSERT INTO admin_logs (admin_id, action_type, details) VALUES (?, ?, ?)",
        [req.user.id, "GENERATE_TEST_CUSTOMERS", `Generated ${numCount} test customers${packageType ? ` with package ${packageType}` : ''}`]
      );
      console.log("Admin action logged successfully");
    } else {
      console.log("admin_logs table does not exist, skipping admin log entry");
    }
  } catch (logError) {
    // Just log the error but continue with customer generation
    console.error("Error logging admin action:", logError);
  }

  await connection.beginTransaction();
  
  try {
    // Track created users
    const createdUsers: any[] = [];

    // Generate and insert test customers
    for (let i = 0; i < numCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const email = generateEmail(firstName, lastName);
      const mobileNumber = generateMobileNumber();
      const selectedPackage = packages[Math.floor(Math.random() * packages.length)];
      const premiumAmount = packagePrices[selectedPackage];
      const address = `${getRandomInt(1, 999)} ${['Main', 'Park', 'Church', 'High', 'Oak', 'Pine', 'Cedar', 'Maple'][Math.floor(Math.random() * 8)]} ${['Street', 'Road', 'Avenue', 'Boulevard', 'Lane', 'Drive'][Math.floor(Math.random() * 6)]}, ${southAfricanCities[Math.floor(Math.random() * southAfricanCities.length)]}`;
      const cardStatus = cardStatuses[Math.floor(Math.random() * cardStatuses.length)];
      const pointsBalance = getRandomInt(0, 10000);
      const createdAt = getRandomDate();
      const referralCode = `REF${Math.random().toString(36).substring(2, 10)}`;
      
      // Standard password for test accounts
      const hashedPassword = await hashPassword('Password123!');

      // Insert user based on schema from db/schema.ts (no username or role fields)
      const [userResult] = await connection.execute(
        `INSERT INTO users (
          first_name, last_name, email, phone_number, password, 
          address, selected_package, 
          card_status, points, created_at,
          is_enabled, referral_code, is_test
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          firstName, lastName, email, mobileNumber, hashedPassword,
          address, selectedPackage, 
          cardStatus, pointsBalance, createdAt,
          true, referralCode, true
        ]
      );

      const userId = (userResult as any).insertId;
      createdUsers.push({
        id: userId,
        first_name: firstName,
        last_name: lastName,
        email: email,
        package: selectedPackage
      });
    }

    await connection.commit();
    
    res.status(200).json({
      success: true,
      message: `Successfully generated ${numCount} test customers`,
      users: createdUsers
    });
    
  } catch (error) {
    await connection.rollback();
    console.error("Transaction failed:", error);
    res.status(500).json({
      error: "Error generating test customers", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}