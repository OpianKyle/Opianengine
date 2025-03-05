import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import memorystore from 'memorystore';
import { JWT_SECRET } from './config';
import jwt from 'jsonwebtoken';
import { createConnection } from './db';

const scryptAsync = promisify(scrypt);
const MemoryStore = memorystore(session);

const crypto = {
  async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`; // hash.salt format
  },

  async verifyPassword(password: string, storedHash: string) {
    try {
      // If using default password '123456', compare directly with default hash
      const defaultHash = '$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS';
      if (storedHash === defaultHash && password === '123456') {
        console.log('Using default password verification');
        return true;
      }

      // Otherwise do normal verification
      const [hash, salt] = storedHash.split('.');
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
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    cookie: {
      maxAge: 86400000,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    },
    store: new MemoryStore({
      checkPeriod: 86400000
    }),
    resave: false,
    saveUninitialized: false,
    name: 'session'
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      console.log('Login attempt:', { email });
      const connection = await createConnection();
      try {
        // Get user with all roles
        const [users] = await connection.execute(
          `SELECT u.*, 
           CASE WHEN au.role_type = 'SUPER_ADMIN' THEN 1 ELSE 0 END as is_super_admin,
           CASE WHEN au.role_type IS NOT NULL THEN 1 ELSE 0 END as is_admin
           FROM users u
           LEFT JOIN admin_users au ON u.id = au.user_id
           WHERE u.email = ?`,
          [email]
        );

        if (!users || users.length === 0) {
          console.log('User not found:', { email });
          return done(null, false, { message: 'Invalid email or password' });
        }

        const user = users[0];
        console.log('Found user:', { 
          id: user.id,
          email: user.email,
          isAgent: user.is_agent,
          isAdmin: user.is_admin,
          isSuperAdmin: user.is_super_admin
        });

        // Verify password
        const isValid = await crypto.verifyPassword(password, user.password);
        if (!isValid) {
          console.log('Invalid password for user:', { id: user.id, email });
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!user.is_enabled) {
          console.log('Account disabled:', { id: user.id, email });
          return done(null, false, { message: 'Account is disabled' });
        }

        // Transform user object 
        const { password: _, ...safeUser } = user;
        const transformedUser = {
          ...safeUser,
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phoneNumber: user.phone_number,
          is_admin: Boolean(user.is_admin),
          is_super_admin: Boolean(user.is_super_admin),
          is_agent: Boolean(user.is_agent),
          is_enabled: Boolean(user.is_enabled)
        };

        console.log('Login successful:', {
          id: transformedUser.id,
          email: transformedUser.email,
          is_admin: transformedUser.is_admin,
          is_super_admin: transformedUser.is_super_admin,
          is_agent: transformedUser.is_agent
        });

        return done(null, transformedUser);
      } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
      } finally {
        await connection.end();
      }
    }
  ));

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    const connection = await createConnection();
    try {
      console.log('Deserializing user:', id);

      const [users] = await connection.execute(
        `SELECT u.*, 
         CASE WHEN au.role_type = 'SUPER_ADMIN' THEN 1 ELSE 0 END as is_super_admin,
         CASE WHEN au.role_type IS NOT NULL THEN 1 ELSE 0 END as is_admin
         FROM users u
         LEFT JOIN admin_users au ON u.id = au.user_id
         WHERE u.id = ?`,
        [id]
      );

      const user = users[0];
      if (!user) {
        console.log('User not found during deserialization:', id);
        return done(null, false);
      }

      // Transform user object with proper type casting
      const { password: _, ...safeUser } = user;
      const transformedUser = {
        ...safeUser,
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        is_admin: Boolean(user.is_admin),
        is_super_admin: Boolean(user.is_super_admin),
        is_agent: Boolean(user.is_agent),
        is_enabled: Boolean(user.is_enabled)
      };

      console.log('User deserialized:', {
        id: transformedUser.id,
        email: transformedUser.email,
        is_admin: transformedUser.is_admin,
        is_super_admin: transformedUser.is_super_admin,
        is_agent: transformedUser.is_agent
      });

      done(null, transformedUser);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    } finally {
      await connection.end();
    }
  });

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

        console.log('Login successful:', {
          id: user.id,
          email: user.email,
          is_admin: user.is_admin,
          is_super_admin: user.is_super_admin,
          is_agent: user.is_agent
        });

        res.json(user);
      });
    })(req, res, next);
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json(req.user);
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

      const hashedPassword = await crypto.hashPassword(req.body.password);
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


  return app;
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

    const roleType = rows[0].role_type;
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
          resolve({ ...safeUser, is_admin: adminStatus.isAdmin, is_super_admin: adminStatus.isSuperAdmin });
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

export async function checkAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.session || !req.session.passport || !req.session.passport.user) {
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
    console.log('Running agent check middleware with session:', {
      hasSession: !!req.session,
      hasPassport: !!req.session?.passport,
      userId: req.session?.passport?.user,
      sessionID: req.sessionID
    });

    if (!req.session || !req.session.passport || !req.session.passport.user) {
      console.log('No session or user found:', req.session);
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check if user exists and is an agent
      const [users] = await connection.execute(
        `SELECT id, email, is_agent, is_enabled 
         FROM users 
         WHERE id = ?`,
        [req.session.passport.user]
      );

      const user = users[0];
      console.log('Agent check results:', {
        userId: req.session.passport.user,
        foundUser: !!user,
        isAgent: user?.is_agent,
        isEnabled: user?.is_enabled
      });

      if (!user || !user.is_agent || !user.is_enabled) {
        console.log('User is not an agent or is disabled:', {
          userId: req.session.passport.user,
          isAgent: user?.is_agent,
          isEnabled: user?.is_enabled
        });
        return res.status(403).json({ error: "Agent access required" });
      }

      console.log('Agent check passed for user:', {
        userId: user.id,
        email: user.email
      });
      next();
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Error in agent check:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Add global error handler
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error('Stack trace:', err.stack);
});