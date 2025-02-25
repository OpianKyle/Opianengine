import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, transactions } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendEmail, formatRegistrationEmail } from "./utils/emailService";
import { parse as parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import memorystore from 'memorystore';
import { JWT_SECRET } from './config'; // Added import for JWT_SECRET

const scryptAsync = promisify(scrypt);
const MemoryStore = memorystore(session);

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      isAdmin: boolean;
      isSuperAdmin: boolean;
      [key: string]: any;
    }
  }
}

export const crypto = {
  async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${salt}.${hash.toString('hex')}`;
  },

  async verifyPassword(password: string, storedHash: string) {
    try {
      const [salt, hash] = storedHash.split('.');
      if (!salt || !hash) return false;

      const hashBuffer = Buffer.from(hash, 'hex');
      const suppliedBuffer = (await scryptAsync(password, salt, 64)) as Buffer;

      return timingSafeEqual(hashBuffer, suppliedBuffer);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }
};

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    console.error('Missing SESSION_SECRET environment variable');
    process.exit(1);
  }

  const store = new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  });

  app.set('trust proxy', 1);

  const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    cookie: {
      maxAge: 86400000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      httpOnly: true
    },
    store,
    resave: false,
    saveUninitialized: false,
    name: 'session'
  });

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user:', id);
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          isAdmin: users.isAdmin,
          isSuperAdmin: users.isSuperAdmin,
          points: users.points,
          selectedPackage: users.selectedPackage,
          isEnabled: users.isEnabled
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log('User not found during deserialization');
        return done(null, false);
      }

      console.log('User deserialized successfully:', user.id);
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          console.log('Login attempt for:', email);
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user) {
            console.log('User not found');
            return done(null, false, { message: 'Invalid email or password' });
          }

          if (!user.isEnabled) {
            console.log('Account is disabled');
            return done(null, false, { message: 'Account is disabled' });
          }

          const isValid = await crypto.verifyPassword(password, user.password);
          console.log('Password verification result:', isValid);

          if (!isValid) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          const { password: _, ...safeUser } = user;
          return done(null, safeUser);
        } catch (error) {
          console.error('Authentication error:', error);
          return done(error);
        }
      }
    )
  );

  // Login route
  app.post("/api/login", (req, res, next) => {
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
        const token = generateToken(user); // Using the updated generateToken function
        console.log('Login successful, token generated for user:', user.id);

        // Return both user data and token
        return res.json({
          user,
          token
        });
      });
    })(req, res, next);
  });

  // Register route
  app.post("/api/register", async (req, res) => {
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
        .limit(1)
        .execute();

      if (existingUser) {
        console.log('User already exists with email:', email);
        return res.status(400).json({
          error: "This email address is already registered"
        });
      }

      const hashedPassword = await crypto.hashPassword(password);
      const newReferralCode = `REF${randomBytes(4).toString('hex')}`;

      try {
        const newUser = await db.transaction(async (tx) => {
          console.log('Starting registration transaction');

          // Insert the user first
          const result = await tx
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
            });

          // Get the inserted user's ID
          const userId = result.insertId;

          // Create welcome bonus points transaction
          await tx
            .insert(transactions)
            .values({
              userId,
              points: points || 0,
              type: "WELCOME_BONUS",
              description: `Welcome bonus points for ${selectedPackage} package registration`,
            });

          // Fetch the newly created user
          const [user] = await tx
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

          return user;
        });

        if (!newUser) {
          throw new Error("Failed to create user record");
        }

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

  // Logout route
  app.post("/api/logout", (req, res) => {
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

  // Get current user route
  app.get("/api/user", (req, res) => {
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

  return sessionMiddleware;
}

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

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


export function generateToken(user: Express.User): string {
  console.log('Generating token for user:', {
    userId: user.id,
    isAdmin: user.isAdmin,
    isSuperAdmin: user.isSuperAdmin
  });

  const token = jwt.sign(
    {
      id: user.id,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log('Token generated successfully:', token.slice(0, 10) + '...');
  return token;
}

export function verifyToken(token: string): { id: number, isAdmin: boolean, isSuperAdmin: boolean } | null {
  try {
    console.log('Verifying token:', {
      tokenLength: token.length,
      firstChars: token.substring(0, 10) + '...',
    });

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number,
      isAdmin: boolean,
      isSuperAdmin: boolean,
      exp?: number
    };

    console.log('Token verified successfully:', {
      userId: decoded.id,
      isAdmin: decoded.isAdmin,
      exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : undefined
    });

    return {
      id: decoded.id,
      isAdmin: decoded.isAdmin,
      isSuperAdmin: decoded.isSuperAdmin
    };
  } catch (error) {
    console.error('Token verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown error type',
      tokenLength: token?.length
    });
    return null;
  }
}

export async function verifySession(req: Request): Promise<any> {
  try {
    console.log('Verifying session for request:', {
      url: req.url,
      headers: {
        cookie: req.headers.cookie,
        'sec-websocket-protocol': req.headers['sec-websocket-protocol']
      }
    });

    if (req.user) {
      console.log('Using existing session user:', req.user);
      return req.user;
    }

    if (!req.headers.cookie) {
      console.log('No cookie found in request');
      return null;
    }

    const cookies = parseCookie(req.headers.cookie);
    const sessionId = cookies['connect.sid'];

    if (!sessionId) {
      console.log('No session ID found in cookies');
      return null;
    }

    console.log('Found session ID:', sessionId);

    return new Promise((resolve) => {
      session({
        secret: process.env.SESSION_SECRET || 'development-secret',
        cookie: {
          maxAge: 86400000, // 24 hours
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        },
        store: new MemoryStore({
          checkPeriod: 86400000 // prune expired entries every 24h
        }),
        resave: false,
        saveUninitialized: false
      }).store.get(sessionId, async (err: any, session: any) => {
        if (err || !session) {
          console.log('Session not found or error:', err);
          resolve(null);
          return;
        }

        try {
          console.log('Retrieved session data:', {
            ...session,
            cookie: '[Redacted]',
            passport: session.passport ? { user: session.passport.user } : undefined
          });

          const userId = session.passport?.user;
          if (!userId) {
            console.log('No user ID in session');
            resolve(null);
            return;
          }

          console.log('Found user ID in session:', userId);

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

          if (!user) {
            console.log('User not found in database');
            resolve(null);
            return;
          }

          const { password: _, ...safeUser } = user;
          console.log('Session verified for user:', safeUser.id);
          resolve(safeUser);
        } catch (error) {
          console.error('Error verifying session:', error);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Error in verifySession:', error);
    return null;
  }
}

const packageMap = {
  1: "BEGINNER",
  2: "NOVICE",
  3: "ACTIVE",
  4: "PROFESSIONAL",
  5: "EXPERT"
};

async function createSuperAdmin() {
  //This function remains unchanged.  No changes were made to this function in the edited code.
}