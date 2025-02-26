import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
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

// Helper function to create database connection
async function createConnection() {
  return await mysql.createConnection({
    host: 'dedi1350.jnb1.host-h.net',
    user: 'admin',
    password: '8E33U976qa800F',
    database: 'opianrewards',
    port: 3306,
    ssl: { rejectUnauthorized: false }
  });
}

// Helper function to check admin status
async function checkUserAdminStatus(userId: number) {
  const connection = await createConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT role_type FROM admin_users WHERE user_id = ?',
      [userId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { isAdmin: false, isSuperAdmin: false };
    }

    const roleType = rows[0].role_type;
    console.log('Admin check result:', { userId, roleType });

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

// Helper function to create admin user
async function createAdminUser(userId: number, isSuperAdmin: boolean = false) {
  const connection = await createConnection();
  try {
    await connection.execute(
      'INSERT INTO admin_users (user_id, role_type) VALUES (?, ?)',
      [userId, isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN']
    );
    console.log(`Created ${isSuperAdmin ? 'super admin' : 'admin'} entry for user:`, userId);
    return true;
  } catch (error) {
    console.error('Error creating admin user:', error);
    return false;
  } finally {
    await connection.end();
  }
}

// Check for existing super admin
async function checkForSuperAdmin() {
  const connection = await createConnection();
  try {
    console.log('Checking for existing super admin...');
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM admin_users WHERE role_type = ?',
      ['SUPER_ADMIN']
    );

    const count = (rows as any)[0].count;
    console.log('Super admin check result:', { count });
    return count > 0;
  } catch (error) {
    console.error('Error checking for super admin:', error);
    return false;
  } finally {
    await connection.end();
  }
}

// Utility functions for password handling
const crypto = {
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
        const connection = await createConnection();
        try {
          console.log('Authentication attempt:', { email });

          const [rows] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
          );

          const user = rows[0];
          if (!user) {
            console.log('User not found:', { email });
            return done(null, false, { message: 'Invalid email or password' });
          }

          console.log('Found user:', { 
            id: user.id, 
            email: user.email,
            enabled: user.is_enabled 
          });

          if (!user.is_enabled) {
            console.log('Account disabled:', { id: user.id, email });
            return done(null, false, { message: 'Account is disabled' });
          }

          const isValid = await crypto.verifyPassword(password, user.password);
          console.log('Password verification:', { 
            id: user.id, 
            email,
            isValid 
          });

          if (!isValid) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          const adminStatus = await checkUserAdminStatus(user.id);
          console.log('Admin status check:', {
            id: user.id,
            email,
            ...adminStatus
          });

          const { password: _, ...safeUser } = user;
          const transformedUser = {
            ...safeUser,
            is_admin: adminStatus.isAdmin,
            is_super_admin: adminStatus.isSuperAdmin,
            is_enabled: Boolean(safeUser.is_enabled),
            is_south_african: Boolean(safeUser.is_south_african),
            has_credit_card: Boolean(safeUser.has_credit_card)
          };

          console.log('Authentication successful:', {
            id: transformedUser.id,
            email: transformedUser.email,
            is_admin: transformedUser.is_admin,
            is_super_admin: transformedUser.is_super_admin
          });

          return done(null, transformedUser);
        } catch (error) {
          console.error('Authentication error:', error);
          return done(error);
        } finally {
          await connection.end();
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    const connection = await createConnection();
    try {
      console.log('Deserializing user:', id);

      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      const user = rows[0];
      if (!user) {
        console.log('User not found during deserialization:', id);
        return done(null, false);
      }

      const adminStatus = await checkUserAdminStatus(user.id);
      const { password: _, ...safeUser } = user;
      const transformedUser = {
        ...safeUser,
        is_admin: adminStatus.isAdmin,
        is_super_admin: adminStatus.isSuperAdmin,
        is_enabled: Boolean(safeUser.is_enabled),
        is_south_african: Boolean(safeUser.is_south_african),
        has_credit_card: Boolean(safeUser.has_credit_card)
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
    } finally {
      await connection.end();
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

      const hashedPassword = await crypto.hashPassword(req.body.password);
      const newReferralCode = `REF${randomBytes(4).toString('hex')}`;
      const shouldBeSuperAdmin = !(await checkForSuperAdmin());

      console.log('Starting registration transaction...');
      await connection.beginTransaction();

      try {
        // Create user
        const [userResult] = await connection.execute(
          `INSERT INTO users (
            email, password, first_name, last_name, 
            phone_number, is_enabled, points, referral_code, 
            referred_by, selected_package,
            is_south_african, id_number, date_of_birth,
            gender, occupation, industry, address,
            city, postal_code, has_credit_card,
            bank_name, account_type, account_number,
            account_holder_name, branch_code, signature
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.body.email,
            hashedPassword,
            req.body.firstName,
            req.body.lastName,
            req.body.mobileNumber,
            1, // is_enabled
            req.body.points || 0,
            newReferralCode,
            req.body.referralCode || null,
            req.body.selectedPackage,
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
            req.body.signature || null
          ]
        );

        const userId = (userResult as any).insertId;
        console.log('User created successfully, ID:', userId);

        // Create admin entry if needed
        if (shouldBeSuperAdmin) {
          const success = await createAdminUser(userId, true);
          if (!success) {
            throw new Error("Failed to create admin user entry");
          }
        }

        await connection.commit();
        console.log('Transaction committed successfully');

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

        req.login(transformedUser, (err) => {
          if (err) {
            console.error('Login error after registration:', err);
            return res.status(500).json({ error: "Registration successful but login failed" });
          }

          console.log('Registration complete. User details:', {
            id: transformedUser.id,
            email: transformedUser.email,
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

          const connection = await createConnection();
          const [user] = await connection.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
          );
          await connection.end();

          if (!user) {
            console.log('User not found in database');
            resolve(null);
            return;
          }

          const adminStatus = await checkUserAdminStatus(userId);

          const { password: _, ...safeUser } = user[0];
          console.log('Session verified for user:', safeUser.id);
          resolve({...safeUser, is_admin: adminStatus.isAdmin, is_super_admin: adminStatus.isSuperAdmin});
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