import express from 'express';
import passport from 'passport';
import { z } from 'zod';
import { users, transactions } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { hashPassword, generateToken } from '../auth';

const router = express.Router();

//Login Schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

//Register Schema
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  points: z.number().int().min(0).optional(),
  selectedPackage: z.string().min(1, "Package selection is required"),
  referralCode: z.string().optional(),
  // Optional fields
  isSouthAfrican: z.boolean().default(false),
  idNumber: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  accountType: z.enum(["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"]).optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  accountHolderName: z.string().optional().nullable(),
  branchCode: z.string().optional().nullable(),
  hasCreditCard: z.boolean().default(false),
  signature: z.string().optional().nullable(),
});

//Login Route
router.post("/api/login", (req, res, next) => {
  console.log('Login request received:', { email: req.body.email });

  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    console.error('Login validation failed:', result.error);
    return res.status(400).json({
      error: "Invalid input data",
      details: result.error.errors
    });
  }

  passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
    if (err) {
      console.error('Authentication error:', err);
      return res.status(500).json({ error: "Authentication error" });
    }

    if (!user) {
      console.log('Authentication failed:', info?.message);
      return res.status(401).json({ error: info?.message || "Invalid email or password" });
    }

    req.login(user, async (loginErr) => {
      if (loginErr) {
        console.error('Login error:', loginErr);
        return res.status(500).json({ error: "Login failed" });
      }

      // Generate token for WebSocket authentication
      const token = generateToken(user);
      console.log('Login successful, token generated for user:', user.id);

      return res.json({
        user,
        token
      });
    });
  })(req, res, next);
});

//Register Route
router.post("/api/register", async (req, res) => {
  try {
    console.log('Registration attempt with data:', {
      ...req.body,
      password: '[REDACTED]'
    });

    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      console.error('Registration validation failed:', result.error);
      return res.status(400).json({
        error: "Invalid input data",
        details: result.error.errors
      });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      referralCode,
      points,
      selectedPackage,
      ...otherFields
    } = result.data;

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      console.log('User already exists with email:', email);
      return res.status(400).json({
        error: "This email address is already registered"
      });
    }

    const hashedPassword = await hashPassword(password);
    const newReferralCode = `REF${randomBytes(4).toString('hex')}`;

    try {
      const newUser = await db.transaction(async (tx) => {
        console.log('Starting registration transaction');

        const [user] = await tx
          .insert(users)
          .values({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phoneNumber,
            isAdmin: false,
            isSuperAdmin: false,
            isEnabled: true,
            points: points || 0,
            referralCode: newReferralCode,
            referredBy: referralCode || null,
            selectedPackage,
            ...otherFields
          })
          .returning();

        if (!user) {
          throw new Error("Failed to create user record");
        }

        await tx
          .insert(transactions)
          .values({
            userId: user.id,
            points: points || 0,
            type: "WELCOME_BONUS",
            description: `Welcome bonus points for ${selectedPackage} package registration`,
          });

        return user;
      });

      const { password: _, ...safeUser } = newUser;

      req.login(safeUser, (err) => {
        if (err) {
          console.error('Login error after registration:', err);
          return res.status(500).json({ error: "Registration successful but login failed" });
        }

        console.log('Registration and login successful for:', safeUser.email);
        res.status(201).json(safeUser);
      });

    } catch (dbError: any) {
      console.error('Database error during registration:', dbError);
      return res.status(500).json({
        error: "Registration failed. Please try again.",
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

  } catch (error: any) {
    console.error('Registration error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Registration failed. Please try again." });
    }
  }
});

//Logout Route
router.post("/api/logout", (req, res) => {
  if (req.user) {
    console.log('Logging out user:', req.user.id);
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: "Logout failed" });
      }
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({ error: "Logout failed" });
        }
        res.clearCookie("session");
        res.json({ message: "Logged out successfully" });
      });
    });
  } else {
    res.status(401).json({ message: "Not logged in" });
  }
});

//Get Current User Route
router.get("/api/user", (req, res) => {
  console.log('User request:', {
    isAuthenticated: req.isAuthenticated(),
    user: req.user ? req.user.id : undefined,
    session: req.session
  });

  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json(req.user);
});

export default router;
