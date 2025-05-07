import express from "express";
import { z } from "zod";
import mysql from 'mysql2/promise';
import { fromZodError } from "zod-validation-error";
import { ResponseError } from "../utils/errors";
import { adminLog } from "../utils/adminLog";
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Create a contact form schema
const contactFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  mobileNumber: z.string().min(10, "Phone number must be at least 10 characters"),
  selectedPackage: z.enum(["OPPORTUNITY", "MOMENTUM", "PROSPER", "PRESTIGE", "PINNACLE"]).optional(),
  notes: z.string().optional(),
});

// Create a new contact submission - completely bypasses the ORM
router.post("/", async (req, res, next) => {
  let connection;
  
  try {
    console.log('Received contact form submission:', req.body);
    
    // Validate the request data
    const validationResult = contactFormSchema.safeParse(req.body);
    if (!validationResult.success) {
      const validationError = fromZodError(validationResult.error);
      throw new ResponseError(validationError.message, 400);
    }
    
    const data = validationResult.data;
    
    // Create a direct database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'dedi1350.jnb1.host-h.net',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || '8E33U976qa800F',
      database: process.env.DB_NAME || 'opianrewards',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    });
    
    // Start a transaction
    await connection.beginTransaction();
    
    // Prepare the SQL query
    const insertQuery = `
      INSERT INTO leads (
        first_name, last_name, email, mobile_number, 
        selected_package, notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    // Execute the query
    const [result] = await connection.execute(insertQuery, [
      data.firstName,
      data.lastName,
      data.email,
      data.mobileNumber,
      data.selectedPackage,
      data.notes || '',
      'new'
    ]);
    
    // Get the inserted ID
    const insertId = result.insertId;
    
    // Commit the transaction
    await connection.commit();
    
    // Log the submission if user is authenticated
    if (req.isAuthenticated() && req.user?.id) {
      await adminLog({
        user_id: req.user.id,
        action: "contact_submitted",
        details: `Contact form submitted: ${data.firstName} ${data.lastName} (${data.email})`,
      });
    } else {
      console.log('Contact form submitted from public form');
    }
    
    // Return success
    res.status(201).json({
      success: true,
      message: "Contact information submitted successfully",
      leadId: insertId
    });
  } catch (error) {
    // Rollback transaction if there was an error
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    
    console.error('Error in contact form submission:', error);
    next(error);
  } finally {
    // Close the connection
    if (connection) {
      try {
        await connection.end();
      } catch (connectionError) {
        console.error('Error closing database connection:', connectionError);
      }
    }
  }
});

export const contactRouter = router;