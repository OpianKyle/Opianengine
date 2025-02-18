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
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000 // 24h
    }),
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 5 * 60 * 1000, // 5 minutes
      sameSite: 'lax'
    }
  }));

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

      console.log('User deserialized successfully');
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
          return done(null, false);
        }

        if (!user.isEnabled) {
          console.log('Account is disabled');
          return done(null, false);
        }

        const isValid = await crypto.verifyPassword(password, user.password);
        console.log('Password verification result:', isValid);

        if (!isValid) {
          return done(null, false);
        }

        return done(null, user);
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

      req.login(newUser, (err) => {
        if (err) {
          console.error('Login error after registration:', err);
          return res.status(500).json({ error: "Registration successful but login failed" });
        }
        res.status(201).json(newUser);
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Registration failed. Please try again." });
    }
  });

  app.post("/api/login", (req, res, next) => {
    try {
      console.log('Login request received:', req.body);

      passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
        if (err) {
          console.error('Authentication error:', err);
          return res.status(500).json({ error: "Authentication error" });
        }

        if (!user) {
          return res.status(401).json({ error: "Invalid email or password" });
        }

        req.login(user, (err) => {
          if (err) {
            console.error('Login error:', err);
            return res.status(500).json({ error: "Login failed" });
          }

          console.log('User logged in successfully');
          const { password: _, ...safeUser } = user as any;
          return res.json(safeUser);
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
      res.clearCookie("connect.sid");
      console.log('User logged out successfully');
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('User session check:', req.isAuthenticated());
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const { password: _, ...safeUser } = req.user as any;
    res.json(safeUser);
  });
}