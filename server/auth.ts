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

export { crypto as authCrypto };

export async function setupAuth(app: Express) {
  // Set up session middleware first with more secure settings
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000 // 24h
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Only use secure in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      path: '/'
    },
    name: 'sid' // Custom session ID name
  }));

  // Initialize passport after session middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize user with better error handling
  passport.serializeUser((user: any, done) => {
    try {
      console.log('Serializing user:', user.id);
      const { password: _, ...safeUser } = user;
      done(null, safeUser);
    } catch (error) {
      console.error('Serialization error:', error);
      done(error);
    }
  });

  // Deserialize with improved error handling
  passport.deserializeUser((user: any, done) => {
    try {
      console.log('Deserializing user:', user.id);
      done(null, user);
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

      const { email, password, firstName, lastName, phoneNumber, referralCode } = result.data;

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
          .where(eq(users.referral_code, referralCode))
          .limit(1);

        if (!referrerUser) {
          return res.status(400).json({
            error: "Invalid referral code"
          });
        }
      }

      const newReferralCode = randomBytes(8).toString('hex');
      const hashedPassword = await crypto.hashPassword(password);

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
            });
        }

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
          console.error('Login error after registration:', err);
          return res.status(500).json({ error: "Registration successful but login failed" });
        }
        res.status(201).json(safeUser);
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Registration failed. Please try again." });
    }
  });

  app.post("/api/login", (req, res, next) => {
    try {
      console.log('Login request received:', { email: req.body.email });

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

          console.log('User logged in successfully:', user);
          return res.json(user);
        });
      })(req, res, next);
    } catch (error) {
      console.error('Login route error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/logout", (req, res) => {
    console.log('Logout request received');
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
        res.clearCookie("sid");
        console.log('User logged out successfully');
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('User session check:', req.isAuthenticated());
    console.log('Session ID:', req.sessionID);
    console.log('Session:', req.session);
    console.log('User:', req.user);

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });
}