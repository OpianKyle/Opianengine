import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import mysql from 'mysql2/promise';

const scryptAsync = promisify(scrypt);

// Helper function to create database connection
async function createConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
    ssl: { rejectUnauthorized: false }
  });
}

const authUtils = {
  async hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },

  async verifyPassword(password: string, storedHash: string) {
    try {
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
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'development-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize passport and restore authentication state
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
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

        if (!users || !users[0]) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const user = users[0];
        if (!user.is_enabled) {
          return done(null, false, { message: 'Account is disabled' });
        }

        const isValid = await authUtils.verifyPassword(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const { password: _, ...safeUser } = user;
        return done(null, safeUser);
      } catch (error) {
        return done(error);
      } finally {
        await connection.end();
      }
    }
  ));

  // Serialize user into session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    const connection = await createConnection();
    try {
      const [users] = await connection.execute(
        `SELECT u.*, 
         CASE WHEN au.role_type = 'SUPER_ADMIN' THEN 1 ELSE 0 END as is_super_admin,
         CASE WHEN au.role_type IS NOT NULL THEN 1 END as is_admin
         FROM users u
         LEFT JOIN admin_users au ON u.id = au.user_id
         WHERE u.id = ?`,
        [id]
      );

      if (!users || !users[0]) {
        return done(null, false);
      }

      const { password: _, ...safeUser } = users[0];
      done(null, safeUser);
    } catch (error) {
      done(error);
    } finally {
      await connection.end();
    }
  });

  // Authentication routes
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error('Authentication error:', err);
        return res.status(500).json({ error: "Authentication failed" });
      }

      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Login error:', loginErr);
          return res.status(500).json({ error: "Login failed" });
        }
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  return app;
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

// Middleware to check if user is an admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user && (req.user.is_admin || req.user.is_super_admin)) {
    return next();
  }
  res.status(403).json({ error: "Admin access required" });
}

// Middleware to check if user is an agent
export function isAgent(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user && req.user.is_agent) {
    return next();
  }
  res.status(403).json({ error: "Agent access required" });
}

// Add global error handler
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error('Stack trace:', err.stack);
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

      const hashedPassword = await authUtils.hashPassword(req.body.password);
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

        const { password: _, ...safeUser } = newUser;

        const transformedUser = {
          ...safeUser,
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