import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "@db";
import mysql from 'mysql2/promise';
import { JWT_SECRET } from './config';
import jwt from 'jsonwebtoken';
import { createConnection } from './db';
import { MemoryStore } from 'express-session';

const scryptAsync = promisify(scrypt);

async function verifyPassword(supplied: string, stored: string): Promise<boolean> {
  try {
    const [hash, salt] = stored.split('.');
    if (!salt || !hash) return false;

    const hashBuffer = Buffer.from(hash, 'hex');
    const suppliedBuffer = (await scryptAsync(supplied, salt, 64)) as Buffer;

    return timingSafeEqual(hashBuffer, suppliedBuffer);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function checkUserAdminStatus(userId: number) {
  const connection = await createConnection();
  try {
    console.log('Checking admin status for user:', userId);
    const [rows] = await connection.execute(
      'SELECT role_type FROM admin_users WHERE user_id = ?',
      [userId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      console.log('No admin entry found for user:', userId);
      return { isAdmin: false, isSuperAdmin: false };
    }

    const roleType = (rows[0] as any).role_type;
    console.log('Admin role found:', { userId, roleType });

    return {
      isAdmin: true,
      isSuperAdmin: roleType === 'SUPER_ADMIN'
    };
  } catch (error) {
    console.error('Error checking admin status:', error);
    return { isAdmin: false, isSuperAdmin: false };
  } finally {
    await connection.end();
  }
}

function parseCookie(cookieString: string | undefined): { [key: string]: string } {
  if (!cookieString) return {};
  const cookies: { [key: string]: string } = {};
  cookieString.split(';').forEach(cookie => {
    const [key, value] = cookie.trim().split('=');
    cookies[key] = value;
  });
  return cookies;
}

export function generateToken(user: any): string {
  const token = jwt.sign(
    {
      id: user.id,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  return token;
}

export function verifyToken(token: string): { id: number, isAdmin: boolean, isSuperAdmin: boolean } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number,
      isAdmin: boolean,
      isSuperAdmin: boolean,
      exp?: number
    };
    return {
      id: decoded.id,
      isAdmin: decoded.isAdmin,
      isSuperAdmin: decoded.isSuperAdmin
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function checkAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.session?.passport?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    const [adminCheck] = await connection.execute(
      'SELECT role_type FROM admin_users WHERE user_id = ?',
      [req.session.passport.user]
    );
    await connection.end();

    if (!adminCheck || (adminCheck as any[]).length === 0) {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error('Error in admin check:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function checkAgent(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      const [users] = await connection.execute(
        `SELECT id, email, is_agent, is_enabled 
         FROM users 
         WHERE id = ?`,
        [(req.user as any).id]
      );

      const user = (users as any[])[0];
      if (!user || !user.is_agent || !user.is_enabled) {
        return res.status(403).json({ error: "Agent access required" });
      }

      next();
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Error in agent check:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export function setupAuth(app: Express) {
  // Configure session middleware with improved settings
  const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'development-secret',
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false, // Set to true in production
      sameSite: 'lax' as const,
      httpOnly: true,
      path: '/'
    },
    name: 'session',
    store: new MemoryStore(),
    resave: false,
    saveUninitialized: false,
    rolling: true // Extend session on activity
  };

  // Initialize session before passport
  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password' },
      async (email, password, done) => {
        const connection = await createConnection();
        try {
          const [users] = await connection.execute(
            `SELECT u.*, 
             CASE WHEN au.role_type = 'SUPER_ADMIN' THEN 1 ELSE 0 END as is_super_admin,
             CASE WHEN au.role_type IS NOT NULL THEN 1 ELSE 0 END as is_admin
             FROM users u
             LEFT JOIN admin_users au ON u.id = au.user_id
             WHERE u.email = ?`,
            [email]
          );

          if (!users || (users as any[]).length === 0) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          const user = (users as any[])[0];
          const isValid = await verifyPassword(password, user.password);

          if (!isValid) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          if (!user.is_enabled) {
            return done(null, false, { message: 'Account is disabled' });
          }

          const { password: _, ...safeUser } = user;
          return done(null, safeUser);
        } catch (error) {
          return done(error);
        } finally {
          await connection.end();
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    const connection = await createConnection();
    try {
      const [users] = await connection.execute(
        `SELECT u.*, 
         CASE WHEN au.role_type = 'SUPER_ADMIN' THEN 1 ELSE 0 END as is_super_admin,
         CASE WHEN au.role_type IS NOT NULL THEN 1 ELSE 0 END as is_admin
         FROM users u
         LEFT JOIN admin_users au ON u.id = au.user_id
         WHERE u.id = ?`,
        [id]
      );

      if (!users || (users as any[]).length === 0) {
        return done(null, false);
      }

      const user = (users as any[])[0];
      const { password: _, ...safeUser } = user;
      done(null, safeUser);
    } catch (error) {
      done(error);
    } finally {
      await connection.end();
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Authentication error" });
      }

      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid email or password" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ error: "Login failed" });
        }
        res.json(user);
      });
    })(req, res, next);
  });

  // User info endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      req.session?.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
        res.status(200).json({ message: "Logged out successfully" });
      });
    });
  });

  // Register route
  app.post("/api/register", async (req, res) => {
    const connection = await createConnection();
    try {
      console.log('Registration attempt with data:', {
        ...req.body,
        password: '[REDACTED]'
      });

      // Check for existing user
      const [existingUsers] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [req.body.email]
      );

      if ((existingUsers as any[]).length > 0) {
        return res.status(400).json({
          error: "This email address is already registered"
        });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const newReferralCode = `REF${randomBytes(4).toString('hex')}`;

      // Calculate initial points based on selected package
      let initialPoints = 0;
      const selectedPackage = req.body.selectedPackage?.toUpperCase();
      console.log('Processing package activation:', { selectedPackage });

      switch (selectedPackage) {
        case 'BEGINNER':
          initialPoints = 5000;
          break;
        case 'NOVICE':
          initialPoints = 10000;
          break;
        case 'ACTIVE':
          initialPoints = 15000;
          break;
        case 'PROFESSIONAL':
          initialPoints = 20000;
          break;
        case 'EXPERT':
          initialPoints = 25000;
          break;
        default:
          initialPoints = 0;
      }

      console.log('Package points calculation:', {
        package: selectedPackage,
        points: initialPoints
      });

      // Start transaction
      await connection.beginTransaction();

      try {
        // Create user with only the required fields initially
        const [userResult] = await connection.execute(
          `INSERT INTO users (
            email, password, first_name, last_name, 
            phone_number, is_enabled, points, referral_code, 
            referred_by, selected_package
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.body.email,
            hashedPassword,
            req.body.firstName,
            req.body.lastName,
            req.body.mobileNumber,
            1, // is_enabled
            initialPoints, // Initial points based on package
            newReferralCode,
            req.body.referralCode || null,
            selectedPackage // Store uppercase package name
          ]
        );

        const userId = (userResult as any).insertId;
        console.log('User created successfully:', {
          id: userId,
          package: selectedPackage,
          points: initialPoints
        });

        // Record the points transaction if points were allocated
        if (initialPoints > 0) {
          await connection.execute(
            `INSERT INTO transactions (
              user_id, points, type, description
            ) VALUES (?, ?, ?, ?)`,
            [
              userId,
              initialPoints,
              'WELCOME_BONUS',
              `Welcome bonus points for ${selectedPackage} package`
            ]
          );
          console.log('Welcome bonus transaction recorded:', {
            userId,
            points: initialPoints,
            package: selectedPackage
          });
        }

        // Update additional user details
        await connection.execute(
          `UPDATE users SET
            is_south_african = ?,
            id_number = ?,
            date_of_birth = ?,
            gender = ?,
            occupation = ?,
            industry = ?,
            address = ?,
            city = ?,
            postal_code = ?,
            has_credit_card = ?,
            bank_name = ?,
            account_type = ?,
            account_number = ?,
            account_holder_name = ?,
            branch_code = ?
          WHERE id = ?`,
          [
            req.body.isSouthAfrican ? 1 : 0,
            req.body.idNumber || null,
            req.body.dateOfBirth || null,
            req.body.gender || null,
            req.body.occupation || null,
            req.body.industry || null,
            req.body.addressLine1 || null,
            req.body.suburb || null,
            req.body.postalCode || null,
            req.body.hasCreditCard ? 1 : 0,
            req.body.bankName || null,
            req.body.accountType || null,
            req.body.accountNumber || null,
            req.body.accountHolderName || null,
            req.body.branchCode || null,
            userId
          ]
        );

        await connection.commit();
        console.log('Registration transaction committed successfully');

        // Fetch complete user data
        const [newUserCheck] = await connection.execute(
          'SELECT * FROM users WHERE id = ?',
          [userId]
        );

        const newUser = newUserCheck[0];
        if (!newUser) {
          throw new Error("Failed to retrieve created user");
        }

        const adminStatus = await checkUserAdminStatus(userId);
        const { password: _, ...safeUser } = newUser;

        const transformedUser = {
          ...safeUser,
          is_admin: adminStatus.isAdmin,
          is_super_admin: adminStatus.isSuperAdmin,
          is_enabled: Boolean(safeUser.is_enabled),
          is_south_african: Boolean(safeUser.is_south_african),
          has_credit_card: Boolean(safeUser.has_credit_card)
        };

        // Log the user in after successful registration
        req.login(transformedUser, (err) => {
          if (err) {
            console.error('Login error after registration:', err);
            return res.status(500).json({ error: "Registration successful but login failed" });
          }

          console.log('Registration complete. User details:', {
            id: transformedUser.id,
            email: transformedUser.email,
            points: transformedUser.points,
            selected_package: transformedUser.selected_package,
            is_admin: transformedUser.is_admin,
            is_super_admin: transformedUser.is_super_admin
          });

          res.status(201).json(transformedUser);
        });

      } catch (error) {
        console.error('Error during registration transaction:', error);
        await connection.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Registration error:', error);
      if (!res.headersSent) {
        return res.status(500).json({
          error: "Registration failed. Please try again.",
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    } finally {
      await connection.end();
    }
  });


  // Add global error handler
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    console.error('Stack trace:', err.stack);
  });

  return app;
}