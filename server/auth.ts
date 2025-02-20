import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express, Request } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
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
const MemoryStore = createMemoryStore(session);

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  // Identity Information
  isSouthAfrican: z.boolean().optional(),
  idNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  // Address Information
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  // Employment Information
  employerName: z.string().optional(),
  jobTitle: z.string().optional(),
  employmentDuration: z.string().optional(),
  // Banking Information
  bankName: z.string().optional(),
  accountType: z.string().optional(),
  accountNumber: z.string().optional(),
  hasCreditCard: z.boolean().optional(),
  // Referral Information
  referralCode: z.string().optional().nullable(),
});

export const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'development-secret',
  resave: false,
  saveUninitialized: false,
  store: new MemoryStore({
    checkPeriod: 86400000 // 24h
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' as const,
    path: '/'
  },
  name: 'connect.sid'
};

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
      sessionConfig.store.get(sessionId, async (err: any, session: any) => {
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
      userId: (decoded as any).id,
      isAdmin: (decoded as any).isAdmin,
      exp: new Date((decoded as any).exp * 1000).toISOString()
    });

    return decoded;
  } catch (error: any) {
    console.error('Token verification failed:', {
      error: error.message,
      name: error.name,
      tokenLength: token?.length
    });
    return null;
  }
}

export function setupAuth(app: Express) {
  app.use(session(sessionConfig));
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

  const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

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

          // Set proper session cookie
          res.cookie('connect.sid', req.sessionID, {
            ...sessionConfig.cookie,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
          });

          const token = generateToken(user);
          console.log('User logged in successfully:', {
            id: user.id,
            email: user.email,
            sessionID: req.sessionID
          });

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
      console.log('Registration attempt:', req.body);

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
        isSouthAfrican,
        idNumber,
        dateOfBirth,
        address,
        city,
        postalCode,
        employerName,
        jobTitle,
        employmentDuration,
        bankName,
        accountType,
        accountNumber,
        hasCreditCard,
        referralCode
      } = result.data;

      // Check for existing user before starting transaction
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({
          error: "This email address is already registered. Please try logging in or use a different email address."
        });
      }

      let referrerUser = null;
      if (referralCode) {
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
      const hashedPassword = await crypto.hashPassword(password);

      let newUser;
      try {
        newUser = await db.transaction(async (tx) => {
          const [user] = await tx
            .insert(users)
            .values({
              email,
              password: hashedPassword,
              firstName,
              lastName,
              phoneNumber,
              isSouthAfrican: isSouthAfrican || false,
              idNumber: idNumber || null,
              dateOfBirth: dateOfBirth || null,
              address: address || null,
              city: city || null,
              postalCode: postalCode || null,
              employerName: employerName || null,
              jobTitle: jobTitle || null,
              employmentDuration: employmentDuration || null,
              bankName: bankName || null,
              accountType: accountType || null,
              accountNumber: accountNumber || null,
              hasCreditCard: hasCreditCard || false,
              isAdmin: false,
              isSuperAdmin: false,
              isEnabled: true,
              points: referralCode ? 2000 : 1000,
              referralCode: newReferralCode,
              referredBy: referralCode || null,
            })
            .returning();

          await tx
            .insert(transactions)
            .values({
              userId: user.id,
              points: referralCode ? 2000 : 1000,
              type: "WELCOME_BONUS",
              description: "Welcome bonus for new registration",
              status: "PROCESSED"
            });

          if (referrerUser) {
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
                status: "PROCESSED"
              });
          }

          return user;
        });
      } catch (error) {
        console.error('Transaction error during registration:', error);
        return res.status(500).json({
          error: "Registration failed. Database transaction error."
        });
      }

      try {
        const { text, html } = formatRegistrationEmail(firstName, newReferralCode);
        await sendEmail({
          to: email,
          subject: "Welcome to OPIAN Rewards!",
          text,
          html
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Continue with registration even if email fails
      }

      try {
        const { password: _, ...safeUser } = newUser;
        // Create a new Promise to handle the login properly
        await new Promise<void>((resolve, reject) => {
          req.login(safeUser, (err) => {
            if (err) {
              console.error('Login error after registration:', err);
              reject(new Error("Registration successful but login failed"));
              return;
            }
            resolve();
          });
        });

        // Set proper session cookie
        res.cookie('connect.sid', req.sessionID, {
          ...sessionConfig.cookie,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        });

        // Generate token for API authentication
        const token = generateToken(safeUser);

        // Return success response with user data and token
        return res.status(201).json({
          user: safeUser,
          token
        });
      } catch (loginError) {
        console.error('Login process error:', loginError);
        return res.status(500).json({
          error: "Registration successful but session creation failed",
          details: (loginError as Error).message
        });
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