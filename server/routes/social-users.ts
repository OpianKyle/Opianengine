import { Router, Request, Response } from 'express';
import { db, pool } from '@db';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import crypto from 'crypto';
import { promisify } from 'util';

const router = Router();
const asyncScrypt = promisify(crypto.scrypt);

// Form validation schema
const socialUserSchema = z.object({
  first_name: z.string().min(2, { message: 'First name must be at least 2 characters.' }),
  last_name: z.string().min(2, { message: 'Last name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .refine(
      (password) => {
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        return hasUppercase && hasLowercase && hasNumber && hasSpecial;
      },
      { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.' }
    ),
});

async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await asyncScrypt(password, salt, 64) as Buffer;
  return `${key.toString('hex')}.${salt}`;
}

// Endpoint to register a new social user
router.post('/register-social-user', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const result = socialUserSchema.safeParse(req.body);
    if (!result.success) {
      const error = fromZodError(result.error);
      return res.status(400).json({ error: error.toString() });
    }

    const userData = result.data;
    
    // Check if user with the same email already exists
    const connection = await pool.getConnection();
    try {
      const [existingUsers] = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [userData.email]
      );
      
      if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        return res.status(400).json({ error: 'A user with this email already exists' });
      }
      
      // Generate a random salt
      const salt = crypto.randomBytes(16).toString('hex');
      
      // Hash the password with the salt
      const hashedPassword = await hashPassword(userData.password, salt);
      
      // Generate a unique referral code
      const referralCode = 'REF' + crypto.randomBytes(4).toString('hex');
      
      // Insert the new social user
      console.log('Attempting to insert social user with data:', {
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
        passwordLength: hashedPassword.length,
        referralCode,
        isEnabled: 1,
        isAdmin: 0,
        isAgent: 0,
        isSuperAdmin: 0,
        isSocial: 1,
        points: 0,
        createdAt: new Date()
      });

      const insertQuery = `INSERT INTO users (
          first_name, 
          last_name, 
          email, 
          password, 
          is_enabled, 
          is_admin, 
          is_agent,
          is_super_admin,
          is_social,
          points,
          created_at,
          referral_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      console.log('SQL Query:', insertQuery);
      
      try {
        const [result] = await connection.query(
          insertQuery,
          [
            userData.first_name,
            userData.last_name,
            userData.email,
            hashedPassword,
            1, // enabled
            0, // not admin
            0, // not agent
            0, // not super admin
            1, // is social user
            0, // zero points
            new Date(),
            referralCode // referral code
          ]
        );
        console.log('Insert result:', result);
      } catch (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error(`Database insert error: ${insertError instanceof Error ? insertError.message : String(insertError)}`);
      }
      
      return res.status(201).json({
        success: true,
        message: 'Social user created successfully'
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating social user:', error);
    // Send more detailed error information for debugging
    return res.status(500).json({ 
      error: 'An error occurred while creating the social user',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;