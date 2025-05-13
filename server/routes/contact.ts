import express from "express";
import { z } from "zod";
import mysql from 'mysql2/promise';
import { fromZodError } from "zod-validation-error";
import { ResponseError } from "../utils/errors";
import { adminLog } from "../utils/adminLog";
import dotenv from 'dotenv';
import { sendLeadNotificationEmail } from '../utils/emailService';

dotenv.config();

const router = express.Router();

// Create a contact form schema that accepts both direct field names and transformed field names
const contactFormSchema = z.object({
  // Support both direct firstName and fullName to be split
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  fullName: z.string().optional(),
  
  // Email is required in all cases
  email: z.string().email("Please enter a valid email address"),
  
  // Support both mobileNumber and phoneNumber
  mobileNumber: z.string().min(10, "Phone number must be at least 10 characters").optional(),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 characters").optional(),
  
  // Package selection
  selectedPackage: z.enum(["OPPORTUNITY", "MOMENTUM", "PROSPER", "PRESTIGE", "PINNACLE"]).optional(),
  
  // Support both notes and message
  notes: z.string().optional(),
  message: z.string().optional(),
})
.refine(data => 
  // Either firstName/lastName directly provided OR fullName provided
  ((data.firstName && data.lastName) || data.fullName),
  {
    message: "Either firstName and lastName OR fullName must be provided",
    path: ["fullName"],
  }
)
.refine(data => 
  // Either mobileNumber OR phoneNumber must be provided
  (data.mobileNumber || data.phoneNumber),
  {
    message: "Either mobileNumber or phoneNumber must be provided",
    path: ["mobileNumber"],
  }
);

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
    
    // Process validated data and normalize it
    const rawData = validationResult.data;
    
    // Handle name fields - either use provided firstName/lastName or split fullName
    let firstName, lastName;
    if (rawData.firstName && rawData.lastName) {
      firstName = rawData.firstName;
      lastName = rawData.lastName;
    } else if (rawData.fullName) {
      const nameParts = rawData.fullName.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    } else {
      // This should never happen due to schema validation, but as a fallback
      firstName = 'Unknown';
      lastName = 'Customer';
    }
    
    // Handle phone number field - use either mobileNumber or phoneNumber
    const mobileNumber = rawData.mobileNumber || rawData.phoneNumber || '';
    
    // Handle notes/message field
    const notes = rawData.notes || rawData.message || '';
    
    // Create a normalized data object
    const data = {
      firstName,
      lastName,
      email: rawData.email,
      mobileNumber,
      selectedPackage: rawData.selectedPackage,
      notes
    };
    
    console.log('Normalized contact form data:', data);
    
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
      data.notes,
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
    
    // Format the lead data for admin notification email
    const leadData = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      mobileNumber: data.mobileNumber,
      selectedPackage: data.selectedPackage || 'Not specified',
      notes: data.notes || 'No additional notes provided',
      status: 'new',
      id: insertId
    };
    
    // Send admin notification email about new lead - now waiting for it to complete
    try {
      console.log('About to call sendLeadNotificationEmail with data:', leadData);
      
      const emailResult = await sendLeadNotificationEmail(leadData);
      
      if (emailResult) {
        console.log(`SUCCESS: Lead notification email sent for ${data.firstName} ${data.lastName}`);
      } else {
        console.error(`FAILED: Lead notification email failed for ${data.firstName} ${data.lastName}`);
      }
    } catch (emailError) {
      console.error('CRITICAL ERROR sending lead notification email:', emailError);
      // We don't want to fail the entire request if just the email fails
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