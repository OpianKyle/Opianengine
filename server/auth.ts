import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
import { db } from "@db";
import { z } from "zod";
import { parse as parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import memorystore from 'memorystore';
import { JWT_SECRET } from './config';
import mysql from 'mysql2/promise';

// Add global error handler
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error('Stack trace:', err.stack);
});

const scryptAsync = promisify(scrypt);
const MemoryStore = memorystore(session);

// Define all schemas at the top
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  mobileNumber: z.string().min(1, "Mobile number is required"),
  selectedPackage: z.enum(["BEGINNER", "NOVICE", "ACTIVE", "PROFESSIONAL", "EXPERT"]),
  referralCode: z.string().optional(),
  points: z.number().int().min(0).optional(),
  isSouthAfrican: z.boolean().optional().default(false),
  idNumber: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  suburb: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  hasCreditCard: z.boolean().optional().default(false),
  bankName: z.string().optional().nullable(),
  accountType: z.enum(["CHEQUE", "SAVINGS", "CURRENT"]).optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  accountHolderName: z.string().optional().nullable(),
  branchCode: z.string().optional().nullable(),
  signature: z.string().optional().nullable()
}).passthrough();

const packageMap = {
  1: "BEGINNER",
  2: "NOVICE",
  3: "ACTIVE",
  4: "PROFESSIONAL",
  5: "EXPERT"
};

// Utility functions
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

// Helper functions
async function checkForSuperAdmin() {
  try {
    console.log('Checking for existing super admin...');
    const connection = await mysql.createConnection({
      host: 'dedi1350.jnb1.host-h.net',
      user: 'admin',
      password: '8E33U976qa800F',
      database: 'opianrewards',
      port: 3306,
      ssl: { rejectUnauthorized: false }
    });

    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE is_super_admin = 1'
    );
    await connection.end();

    const count = (rows as any)[0].count;
    console.log('Super admin check result:', { count });
    return count > 0;
  } catch (error) {
    console.error('Error checking for super admin:', error);
    return false;
  }
}

// Main setup function
export function setupAuth(app: Express) {
  console.log('Starting auth setup...');

  if (!process.env.SESSION_SECRET) {
    console.error('Missing SESSION_SECRET environment variable');
    process.exit(1);
  }

  const store = new MemoryStore({
    checkPeriod: 86400000
  });

  app.set('trust proxy', 1);

  const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    cookie: {
      maxAge: 86400000,
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

  // Configure passport
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          console.log('Attempting authentication for:', email);
          const connection = await mysql.createConnection({
            host: 'dedi1350.jnb1.host-h.net',
            user: 'admin',
            password: '8E33U976qa800F',
            database: 'opianrewards',
            port: 3306,
            ssl: { rejectUnauthorized: false }
          });

          const [rows] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
          );

          await connection.end();

          const user = rows[0];

          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          if (!user.is_enabled) {
            return done(null, false, { message: 'Account is disabled' });
          }

          const isValid = await crypto.verifyPassword(password, user.password);
          if (!isValid) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          console.log('User login data:', {
            id: user.id,
            email: user.email,
            is_admin: user.is_admin,
            is_super_admin: user.is_super_admin,
            admin_type: typeof user.is_admin,
            super_admin_type: typeof user.is_super_admin
          });

          const { password: _, ...safeUser } = user;
          const transformedUser = {
            ...safeUser,
            is_admin: !!safeUser.is_admin,
            is_super_admin: !!safeUser.is_super_admin,
            is_enabled: !!safeUser.is_enabled,
            is_south_african: !!safeUser.is_south_african,
            has_credit_card: !!safeUser.has_credit_card
          };

          console.log('Transformed user data:', {
            id: transformedUser.id,
            email: transformedUser.email,
            is_admin: transformedUser.is_admin,
            is_super_admin: transformedUser.is_super_admin
          });

          return done(null, transformedUser);
        } catch (error) {
          console.error('Authentication error:', error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user:', id);
      const connection = await mysql.createConnection({
        host: 'dedi1350.jnb1.host-h.net',
        user: 'admin',
        password: '8E33U976qa800F',
        database: 'opianrewards',
        port: 3306,
        ssl: { rejectUnauthorized: false }
      });

      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      await connection.end();

      const user = rows[0];
      if (!user) {
        console.log('User not found during deserialization:', id);
        return done(null, false);
      }

      const { password: _, ...safeUser } = user;
      const transformedUser = {
        ...safeUser,
        is_admin: !!safeUser.is_admin,
        is_super_admin: !!safeUser.is_super_admin,
        is_enabled: !!safeUser.is_enabled,
        is_south_african: !!safeUser.is_south_african,
        has_credit_card: !!safeUser.has_credit_card
      };

      console.log('Deserialized user:', {
        id: transformedUser.id,
        email: transformedUser.email,
        is_admin: transformedUser.is_admin,
        is_super_admin: transformedUser.is_super_admin
      });

      done(null, transformedUser);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  // Route handlers
  app.post("/api/login", (req, res, next) => {
    console.log('Login request received:', { email: req.body.email });

    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        console.error('Authentication error:', err);
        return res.status(500).json({ error: "Authentication error" });
      }

      if (!user) {
        console.log('Authentication failed:', info?.message);
        return res.status(401).json({ error: info?.message || "Invalid email or password" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Login error:', loginErr);
          return res.status(500).json({ error: "Login failed" });
        }

        console.log('Login successful for user:', {
          id: user.id,
          email: user.email,
          is_admin: user.is_admin,
          is_super_admin: user.is_super_admin
        });

        return res.json(user);
      });
    })(req, res, next);
  });

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
        mobileNumber: phoneNumber,
        referralCode,
        selectedPackage,
        points,
        isSouthAfrican,
        idNumber,
        dateOfBirth,
        gender,
        occupation,
        industry,
        addressLine1: address,
        suburb: city,
        postalCode,
        hasCreditCard,
        bankName,
        accountType,
        accountNumber,
        accountHolderName,
        branchCode,
        signature
      } = result.data;

      try {
        console.log('Attempting database connection...');
        const connection = await mysql.createConnection({
          host: 'dedi1350.jnb1.host-h.net',
          user: 'admin',
          password: '8E33U976qa800F',
          database: 'opianrewards',
          port: 3306,
          ssl: { rejectUnauthorized: false }
        });

        // Check for existing user
        const [existingUsers] = await connection.execute(
          'SELECT id FROM users WHERE email = ?',
          [email]
        );

        if ((existingUsers as any[]).length > 0) {
          await connection.end();
          return res.status(400).json({
            error: "This email address is already registered"
          });
        }

        const hashedPassword = await crypto.hashPassword(password);
        const newReferralCode = `REF${randomBytes(4).toString('hex')}`;
        const shouldBeSuperAdmin = !(await checkForSuperAdmin());

        console.log('Starting registration transaction...');
        await connection.beginTransaction();

        try {
          console.log('Executing user insert...');
          const [userResult] = await connection.execute(
            `INSERT INTO users (
              email, password, first_name, last_name, 
              phone_number, is_admin, is_super_admin, 
              is_enabled, points, referral_code, 
              referred_by, selected_package,
              is_south_african, id_number, date_of_birth,
              gender, occupation, industry, address,
              city, postal_code, has_credit_card,
              bank_name, account_type, account_number,
              account_holder_name, branch_code, signature
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              email,
              hashedPassword,
              firstName,
              lastName,
              phoneNumber,
              shouldBeSuperAdmin ? 1 : 0,
              shouldBeSuperAdmin ? 1 : 0,
              1, // is_enabled
              points || 0,
              newReferralCode,
              referralCode || null,
              selectedPackage,
              isSouthAfrican ? 1 : 0,
              idNumber || null,
              dateOfBirth || null,
              gender || null,
              occupation || null,
              industry || null,
              address || null,
              city || null,
              postalCode || null,
              hasCreditCard ? 1 : 0,
              bankName || null,
              accountType || null,
              accountNumber || null,
              accountHolderName || null,
              branchCode || null,
              signature || null
            ]
          );

          const userId = (userResult as any).insertId;
          console.log('User created successfully, ID:', userId);

          console.log('Creating welcome bonus transaction...');
          await connection.execute(
            `INSERT INTO transactions (
              user_id, points, type, description
            ) VALUES (?, ?, ?, ?)`,
            [
              userId,
              points || 0,
              "WELCOME_BONUS",
              `Welcome bonus points for ${selectedPackage} package registration`
            ]
          );

          const [users] = await connection.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
          );

          await connection.commit();
          console.log('Transaction committed successfully');

          const newUser = users[0];
          if (!newUser) {
            throw new Error("Failed to retrieve created user");
          }

          const { password: _, ...safeUser } = newUser;
          const transformedUser = {
            ...safeUser,
            is_admin: !!safeUser.is_admin,
            is_super_admin: !!safeUser.is_super_admin,
            is_enabled: !!safeUser.is_enabled,
            is_south_african: !!safeUser.is_south_african,
            has_credit_card: !!safeUser.has_credit_card
          };

          req.login(transformedUser, (err) => {
            if (err) {
              console.error('Login error after registration:', err);
              return res.status(500).json({ error: "Registration successful but login failed" });
            }

            console.log('Registration and login successful for:', transformedUser.email);
            if (shouldBeSuperAdmin) {
              console.log('Created super admin account:', transformedUser.email);
            }
            res.status(201).json(transformedUser);
          });

        } catch (error) {
          console.error('Error during registration transaction:', error);
          await connection.rollback();
          throw error;
        } finally {
          await connection.end();
        }

      } catch (dbError) {
        console.error('Database error during registration:', dbError);
        return res.status(500).json({
          error: "Registration failed. Please try again.",
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }

    } catch (error) {
      console.error('Registration error:', error);
      if (!res.headersSent) {
        return res.status(500).json({ error: "Registration failed. Please try again." });
      }
    }
  });

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

  app.get("/api/user", (req, res) => {
    console.log('User request:', {
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        is_admin: req.user.is_admin,
        is_super_admin: req.user.is_super_admin
      } : undefined
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  return sessionMiddleware;
}

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
          maxAge: 86400000,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        },
        store: new MemoryStore({
          checkPeriod: 86400000
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
            .limit(1)
            .execute();

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