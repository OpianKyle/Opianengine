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
  const store = new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  });

  if (!process.env.SESSION_SECRET) {
    console.error('Missing SESSION_SECRET environment variable');
    process.exit(1);
  }

  app.use(
    session({
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
      name: 'session_id' // Use a generic name instead of connect.sid
    })
  );

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

        console.log('Authentication successful for user:', user.id);
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error('Login error:', loginErr);
            return res.status(500).json({ error: "Login failed" });
          }

          if (req.session) {
            req.session.cookie.maxAge = 86400000; // 24 hours
            console.log('Session cookie set:', {
              maxAge: req.session.cookie.maxAge,
              path: req.session.cookie.path,
              secure: req.session.cookie.secure,
              httpOnly: req.session.cookie.httpOnly
            });
          }

          console.log('Login successful for user:', user.id);
          return res.json({ user });
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
        password: '[REDACTED]',
        referralCode: req.body.referralCode
      });

      const registerSchema = z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        phoneNumber: z.string().min(1, "Phone number is required"),
        referralCode: z.string().optional(),
        isSouthAfrican: z.boolean().default(false),
        idNumber: z.string().optional().nullable(),
        dateOfBirth: z.string().optional().nullable(),
        gender: z.string().optional().nullable(),
        occupation: z.string().optional().nullable(),
        industry: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        postalCode: z.string().optional().nullable(),
        selectedPackage: z.string().optional().nullable(),
        bankName: z.string().optional().nullable(),
        accountType: z.enum(["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"]).optional().nullable(),
        accountNumber: z.string().optional().nullable(),
        accountHolderName: z.string().optional().nullable(),
        branchCode: z.string().optional().nullable(),
        hasCreditCard: z.boolean().default(false),
        signature: z.string().optional().nullable(),
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
        address,
        city,
        postalCode,
        selectedPackage,
        bankName,
        accountType,
        accountNumber,
        hasCreditCard,
        signature,
        gender,
        occupation,
        industry,
        accountHolderName,
        branchCode
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

      let referrer = null;
      if (referralCode) {
        console.log('Verifying referral code:', referralCode);
        [referrer] = await db
          .select({
            id: users.id,
            isEnabled: users.isEnabled,
            points: users.points,
            referralCode: users.referralCode,
            referredBy: users.referredBy
          })
          .from(users)
          .where(eq(users.referralCode, referralCode))
          .limit(1);

        if (!referrer || !referrer.isEnabled) {
          console.log('Invalid referral code:', referralCode);
          return res.status(400).json({
            error: "Invalid referral code"
          });
        }
        console.log('Valid referral code found for referrer:', referrer.id);
      }

      const hashedPassword = await crypto.hashPassword(password);
      const newReferralCode = `REF${randomBytes(4).toString('hex')}`;

      try {
        const newUser = await db.transaction(async (tx) => {
          console.log('Starting registration transaction with data:', {
            email,
            firstName,
            lastName,
            newReferralCode,
            referredBy: referralCode
          });

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
              points: 1000,
              referralCode: newReferralCode,
              referredBy: referralCode || null,
              isSouthAfrican: isSouthAfrican || false,
              idNumber: idNumber || null,
              dateOfBirth: dateOfBirth || null,
              address: address || null,
              city: city || null,
              postalCode: postalCode || null,
              selectedPackage: selectedPackage || null,
              bankName: bankName || null,
              accountType: accountType || null,
              accountNumber: accountNumber || null,
              hasCreditCard: hasCreditCard || false,
              signature: signature || null,
              createdAt: new Date(),
              gender: gender || null,
              occupation: occupation || null,
              industry: industry || null,
              accountHolderName: accountHolderName || null,
              branchCode: branchCode || null,
            })
            .returning();

          console.log('Created new user:', {
            id: user.id,
            email: user.email,
            referralCode: user.referralCode,
            referredBy: user.referredBy
          });

          if (!user) {
            throw new Error("Failed to create user record");
          }

          await tx
            .insert(transactions)
            .values({
              userId: user.id,
              points: 1000,
              type: "WELCOME_BONUS",
              description: "Welcome bonus for new registration",
            });

          if (referrer) {
            console.log('Processing referral bonus for referrer:', referrer.id);

            await tx
              .insert(transactions)
              .values({
                userId: referrer.id,
                points: 2000,
                type: "REFERRAL_BONUS",
                description: `Referral bonus for inviting ${user.email}`,
              });

            await tx
              .update(users)
              .set({ points: referrer.points + 2000 })
              .where(eq(users.id, referrer.id));
          }

          return user;
        });

        const { password: _, ...safeUser } = newUser;

        console.log('Logging in new user:', safeUser.id);
        await new Promise((resolve, reject) => {
          req.login(safeUser, (err) => {
            if (err) {
              console.error('Login error after registration:', err);
              reject(err);
            } else {
              console.log('Login successful after registration');
              resolve(null);
            }
          });
        });

        return res.status(201).json(safeUser);

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
    console.log('User request:', {
      isAuthenticated: req.isAuthenticated(),
      user: req.user
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });
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
  isSouthAfrican: z.boolean().default(false),
  idNumber: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  selectedPackage: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  accountType: z.enum(["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"]).optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  accountHolderName: z.string().optional().nullable(),
  branchCode: z.string().optional().nullable(),
  hasCreditCard: z.boolean().default(false),
  signature: z.string().optional().nullable(),
});

export const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret';

interface JwtPayload {
  id: number;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  exp?: number;
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    console.log('Verifying token:', {
      tokenLength: token.length,
      firstChars: token.substring(0, 10) + '...',
    });

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    console.log('Token verified successfully:', {
      userId: decoded.id,
      isAdmin: decoded.isAdmin,
      exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : undefined
    });

    return decoded;
  } catch (error) {
    console.error('Token verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown error type',
      tokenLength: token?.length
    });
    return null;
  }
}

export function generateToken(user: any): string {
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