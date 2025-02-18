import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, transactions } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendEmail, formatRegistrationEmail } from "./utils/emailService";

// Extend Express.User interface
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      isAdmin: boolean;
      isSuperAdmin: boolean;
      isEnabled: boolean;
      points: number;
    }
  }
}

const scryptAsync = promisify(scrypt);
const MemoryStore = createMemoryStore(session);

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
  referralCode: z.string().optional(),
});

// Export utility functions for password handling
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}.${hash.toString('hex')}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [salt, hash] = stored.split('.');
  const hashBuffer = Buffer.from(hash, 'hex');
  const suppliedBuffer = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashBuffer, suppliedBuffer);
}

export async function setupAuth(app: Express) {
  // Use a default secret for development
  const sessionSecret = 'development-secret-key-do-not-use-in-production';

  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({ 
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: false, // set to true if using HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, done) => {
    const { password: _, ...safeUser } = user as any;
    done(null, safeUser);
  });

  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });

  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.isEnabled) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const { password: _, ...safeUser } = user;
        return done(null, safeUser);
      } catch (error) {
        return done(error);
      }
    }
  ));

  app.post("/api/register", async (req, res) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid input data", 
          details: result.error.errors 
        });
      }

      const { email, password, firstName, lastName, phoneNumber, referralCode } = result.data;

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ 
          error: "This email address is already registered" 
        });
      }

      const newReferralCode = randomBytes(8).toString('hex');
      const hashedPassword = await hashPassword(password);

      const newUser = await db.transaction(async (tx) => {
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
            points: 2000,
            referral_code: newReferralCode,
            referred_by: referralCode || null,
          })
          .returning();

        await tx
          .insert(transactions)
          .values({
            userId: user.id,
            points: 2000,
            type: "WELCOME_BONUS",
            description: "Welcome bonus for new registration",
          });

        return user;
      });

      const { text, html } = formatRegistrationEmail(firstName, newReferralCode);
      await sendEmail({
        to: email,
        subject: "Welcome to OPIAN Rewards!",
        text,
        html
      });

      const { password: _, ...safeUser } = newUser;
      req.login(safeUser, (err) => {
        if (err) {
          return res.status(500).json({ error: "Registration successful but login failed" });
        }
        res.status(201).json(safeUser);
      });
    } catch (error) {
      res.status(500).json({ error: "Registration failed. Please try again." });
    }
  });

  app.post("/api/login", (req, res, next) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }

    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) return res.status(500).json({ error: "Authentication error" });
      if (!user) return res.status(401).json({ error: info?.message || "Invalid email or password" });

      req.login(user, (loginErr) => {
        if (loginErr) return res.status(500).json({ error: "Login failed" });
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy((err) => {
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