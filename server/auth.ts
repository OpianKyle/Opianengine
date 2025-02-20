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

const scryptAsync = promisify(scrypt);

// Create the MemoryStore using a dynamic import
let MemoryStore: any;
try {
  const memorystore = await import('memorystore');
  MemoryStore = memorystore.default(session);
} catch (error) {
  console.error('Failed to import memorystore:', error);
  process.exit(1);
}

export function setupAuth(app: Express) {
  // Configure session middleware with MemoryStore
  app.use(
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
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user:', id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log('User not found during deserialization');
        return done(null, false);
      }

      const { password: _, ...safeUser } = user;
      console.log('User deserialized successfully:', safeUser.id);
      done(null, safeUser);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  passport.use(new LocalStrategy(
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
  ));

  app.post("/api/login", (req, res, next) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
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
          return res.status(401).json({ error: info?.message || "Invalid email or password" });
        }

        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error('Login error:', loginErr);
            return res.status(500).json({ error: "Login failed" });
          }

          // Generate token for WebSocket authentication
          const token = generateToken(user);

          console.log('User logged in successfully:', user);
          return res.json({ user, token });
        });
      })(req, res, next);
    } catch (error) {
      console.error('Login route error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
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
        phoneNumber,
        referralCode,
        isSouthAfrican,
        idNumber,
        dateOfBirth,
        gender,
        occupation,
        industry,
        addressLine1,
        addressLine2,
        suburb,
        postalCode,
        hasCreditCard,
        selectedPackage,
        accountHolderName,
        bankName,
        branchCode,
        accountNumber,
        accountType,
        signature
      } = result.data;

      console.log('Checking for existing user with email:', email);
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        console.log('User already exists with email:', email);
        return res.status(400).json({
          error: "This email address is already registered. Please try logging in or use a different email address."
        });
      }

      let referrerUser = null;
      if (referralCode) {
        console.log('Looking up referral code:', referralCode);
        [referrerUser] = await db
          .select()
          .from(users)
          .where(eq(users.referralCode, referralCode))
          .limit(1);

        if (!referrerUser) {
          return res.status(400).json({
            error: "Invalid referral code"
          });
        }
      }

      const newReferralCode = randomBytes(8).toString('hex');
      console.log('Generated new referral code:', newReferralCode);
      const hashedPassword = await crypto.hashPassword(password);

      console.log('Starting transaction for new user creation');
      try {
        const newUser = await db.transaction(async (tx) => {
          console.log('Creating new user record');
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
              points: referralCode ? 2000 : 1000,
              referralCode: newReferralCode,
              referredBy: referralCode || null,
              isSouthAfrican: isSouthAfrican || false,
              idNumber: idNumber || null,
              dateOfBirth: dateOfBirth || null,
              gender: gender || null,
              occupation: occupation || null,
              industry: industry || null,
              addressLine1: addressLine1 || null,
              addressLine2: addressLine2 || null,
              suburb: suburb || null,
              postalCode: postalCode || null,
              hasCreditCard: hasCreditCard || false,
              selectedPackage: selectedPackage || null,
              accountHolderName: accountHolderName || null,
              bankName: bankName || null,
              branchCode: branchCode || null,
              accountNumber: accountNumber || null,
              accountType: accountType || null,
              signature: signature || null,
              createdAt: new Date()
            })
            .returning();

          console.log('Adding welcome bonus transaction');
          await tx
            .insert(transactions)
            .values({
              userId: user.id,
              points: referralCode ? 2000 : 1000,
              type: "WELCOME_BONUS",
              description: "Welcome bonus for new registration",
            });

          if (referrerUser) {
            console.log('Processing referral bonus for referrer:', referrerUser.id);
            await tx
              .update(users)
              .set({ points: referrerUser.points + 2500 })
              .where(eq(users.id, referrerUser.id));

            await tx
              .insert(transactions)
              .values({
                userId: referrerUser.id,
                points: 2500,
                type: "REFERRAL_BONUS",
                description: `Referral bonus for referring ${email}`,
              });
          }

          return user;
        });

        console.log('Successfully created new user:', {
          id: newUser.id,
          email: newUser.email
        });

        const { password: _, ...safeUser } = newUser;
        req.login(safeUser, (err) => {
          if (err) {
            console.error('Login error after registration:', err);
            return res.status(500).json({ error: "Registration successful but login failed" });
          }
          res.status(201).json(safeUser);
        });
      } catch (dbError) {
        console.error('Database error during registration:', dbError);
        res.status(500).json({ error: "Database error during registration" }); 
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Registration failed. Please try again." });
    }
  });

  app.post("/api/logout", (req, res) => {
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
        res.clearCookie("connect.sid"); 
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });
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

    // If we already have user data from passport, return it
    if (req.user) {
      console.log('Using existing session user:', req.user);
      return req.user;
    }

    // For WebSocket requests, parse the cookie and verify the session
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

    // Verify session from store
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
            // Redact sensitive data in logs
            cookie: '[Redacted]',
            passport: session.passport ? { user: session.passport.user } : undefined
          });

          // Get user data from passport session
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

const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret';

export function verifyToken(token: string): any {
  try {
    console.log('Verifying token:', {
      tokenLength: token.length,
      firstChars: token.substring(0, 10) + '...',
    });

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verified successfully:', {
      userId: decoded.id,
      isAdmin: decoded.isAdmin,
      exp: new Date(decoded.exp * 1000).toISOString()
    });

    return decoded;
  } catch (error) {
    console.error('Token verification failed:', {
      error: error.message,
      name: error.name,
      tokenLength: token?.length
    });
    return null;
  }
}

export function generateToken(user: any) {
  return jwt.sign(
    {
      id: user.id,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
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
  referralCode: z.string().optional().nullable(),
  isSouthAfrican: z.boolean().optional().default(false),
  idNumber: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  suburb: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  hasCreditCard: z.boolean().optional().default(false),
  selectedPackage: z.number().optional().nullable(),
  accountHolderName: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  branchCode: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  accountType: z.string().optional().nullable(),
  signature: z.string().optional().nullable(),
});