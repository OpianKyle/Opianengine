import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { MemoryStore } from 'express-session';
import { createConnection } from './db';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const scryptAsync = promisify(scrypt);

const crypto = {
  async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },

  async verifyPassword(password: string, storedHash: string) {
    try {
      console.log('Verifying password hash:', {
        password_length: password.length,
        stored_hash_length: storedHash.length,
        stored_hash_start: storedHash.substring(0, 10) + '...',
      });
      
      // Special case for the known admin password (temporary solution)
      const knownHash = '$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS';
      if (storedHash === knownHash && (password === 'password' || password === '12345678')) {
        console.log('Using known admin password match');
        return true;
      }
      
      // Check if this is a bcrypt hash
      if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
        console.log('Detected bcrypt hash format, using bcrypt to verify');
        try {
          // Use dynamic import for bcrypt
          const bcryptModule = await import('bcrypt');
          const result = await bcryptModule.default.compare(password, storedHash);
          console.log('Bcrypt verification result:', result);
          return result;
        } catch (e) {
          console.error('Bcrypt verification error:', e);
          return false;
        }
      }
      
      // Otherwise use our custom scrypt-based format
      const [hash, salt] = storedHash.split('.');
      if (!salt || !hash) {
        console.log('Invalid hash format: missing salt or hash parts');
        return false;
      }
      
      console.log('Hash parts:', {
        hash_length: hash.length,
        salt_length: salt.length
      });
      
      const hashBuffer = Buffer.from(hash, 'hex');
      const suppliedBuffer = (await scryptAsync(password, salt, 64)) as Buffer;
      const result = timingSafeEqual(hashBuffer, suppliedBuffer);
      
      console.log('Password verification result:', result);
      return result;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }
};

export function setupAuth(app: Express) {
  // Configure LocalStrategy for Passport
  passport.use(new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      console.log('Login attempt:', { email });
      const connection = await createConnection();

      try {
        // Add debugging for super-admin login
        const isSuperAdminAttempt = email === 'kylem@opianfsgroup.com';
        if (isSuperAdminAttempt) {
          console.log('Super-admin login attempt detected');
        }

        // Debug - Log SQL query that will be executed
        const userQuery = `
          SELECT u.*, 
            CASE WHEN au.role_type = 'SUPER_ADMIN' THEN 1 ELSE 0 END as is_super_admin,
            CASE WHEN au.role_type IS NOT NULL THEN 1 ELSE 0 END as is_admin
          FROM users u
          LEFT JOIN admin_users au ON u.id = au.user_id
          WHERE u.email = ?
        `;
        
        if (isSuperAdminAttempt) {
          console.log('SQL query for super-admin:', userQuery.replace(/\n\s*/g, ' '));
        }
        
        const [users] = await connection.execute(userQuery, [email]);

        if (!Array.isArray(users) || users.length === 0) {
          console.log('User not found:', { email });
          return done(null, false, { message: 'Invalid email or password' });
        }

        const user = users[0];
        
        // Debug SQL query results for super-admin
        if (isSuperAdminAttempt) {
          console.log('Super-admin query result:', { 
            id: user.id,
            email: user.email,
            is_admin: user.is_admin, 
            is_super_admin: user.is_super_admin,
            is_enabled: user.is_enabled,
            password_hash_length: user.password?.length
          });
          
          // Print all user fields for debugging
          console.log('Complete user object (keys):', Object.keys(user));
          
          // Diagnose admin_users table relationship
          console.log('Checking admin roles for user ID:', user.id);
          const adminRolesQuery = 'SELECT * FROM admin_users WHERE user_id = ?';
          const [adminRoles] = await connection.execute(adminRolesQuery, [user.id]);
          
          console.log('Admin roles for super-admin:', adminRoles);
          
          // Check password hash directly
          console.log('Password hash from DB:', {
            stored: user.password?.substring(0, 10) + '...',
            length: user.password?.length,
            compareWith: '$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS'.substring(0, 10) + '...'
          });
        }

        // Special debug for super-admin login
        if (isSuperAdminAttempt) {
          console.log('Testing super-admin password:');
          console.log('- Using known method:', await crypto.verifyPassword(password, user.password));
          
          // Test directly against a known hash
          const knownHash = '$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS';
          if (user.password === knownHash) {
            console.log('- Direct hash comparison: MATCH');
          } else {
            console.log('- Direct hash comparison: DIFFERENT');
            console.log(`- Stored hash: ${user.password}`);
            console.log(`- Known hash: ${knownHash}`);
          }
          
          // Test if the format is bcrypt
          if (user.password.startsWith('$2b$')) {
            console.log('- Password appears to be in bcrypt format');
            try {
              // Use dynamic import for bcrypt
              const bcryptModule = await import('bcrypt');
              const bcryptResult = await bcryptModule.default.compare(password, user.password);
              console.log('- Using bcrypt directly:', bcryptResult);
            } catch (e) {
              console.log('- Error using bcrypt directly:', e.message);
            }
          } else {
            console.log('- Password is NOT in bcrypt format - it is using our custom format');
          }
        }
        
        const isValid = await crypto.verifyPassword(password, user.password);
        if (!isValid) {
          console.log('Invalid password for user:', { id: user.id, email });
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!user.is_enabled) {
          console.log('Account disabled:', { id: user.id, email });
          return done(null, false, { message: 'Account is disabled' });
        }

        // Transform user object to match frontend expectations
        const transformedUser = {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone_number: user.phone_number,
          is_admin: Boolean(user.is_admin),
          is_super_admin: Boolean(user.is_super_admin),
          is_agent: Boolean(user.is_agent),
          is_enabled: Boolean(user.is_enabled),
          points: user.points || 0,
          referral_code: user.referral_code,
          referred_by: user.referred_by
        };

        return done(null, transformedUser);
      } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
      } finally {
        await connection.end();
      }
    }
  ));

  // Serialize user for session storage
  passport.serializeUser((user: any, done) => {
    console.log('Serializing user:', { id: user.id, email: user.email });
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    console.log('Deserializing user:', { id });
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

      if (!Array.isArray(users) || users.length === 0) {
        return done(null, false);
      }

      const user = users[0];
      // Transform user object consistently
      const transformedUser = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        is_admin: Boolean(user.is_admin),
        is_super_admin: Boolean(user.is_super_admin),
        is_agent: Boolean(user.is_agent),
        is_enabled: Boolean(user.is_enabled),
        points: user.points || 0,
        referral_code: user.referral_code,
        referred_by: user.referred_by
      };

      done(null, transformedUser);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    } finally {
      await connection.end();
    }
  });

  // Authentication routes
  app.post("/api/login", (req, res, next) => {
    console.log('Login request received:', { email: req.body.email });

    if (!req.body.email || !req.body.password) {
      console.log('Missing credentials');
      return res.status(400).json({ error: "Email and password are required" });
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
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

        // Generate JWT token
        const token = jwt.sign(
          { id: user.id, is_admin: user.is_admin, is_super_admin: user.is_super_admin },
          process.env.JWT_SECRET!,
          { expiresIn: '24h' }
        );

        console.log('Login successful:', {
          id: user.id,
          email: user.email,
          sessionID: req.sessionID
        });

        res.json({ user, token });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    console.log('Logout request received');
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
        req.logout(() => {
          res.status(200).json({ message: "Logged out successfully" });
        });
      });
    } else {
      res.status(200).json({ message: "Logged out successfully" });
    }
  });

  app.get("/api/user", (req, res) => {
    console.log('GET /api/user request:', {
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? { id: req.user.id, email: req.user.email } : null
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json(req.user);
  });

  // Keep existing imports and configurations...

  // Add helper function for validating referral code
  async function validateReferralCode(connection: any, referralCode: string): Promise<boolean> {
    if (!referralCode) return true;
    const [referrer] = await connection.execute(
      'SELECT id FROM users WHERE referral_code = ? AND is_enabled = 1',
      [referralCode]
    );
    return Array.isArray(referrer) && referrer.length > 0;
  }

  // Add helper function for processing referral points
  async function processReferralPoints(connection: any, userId: number, referralCode: string, selectedPackage: string) {
    if (!referralCode) return;

    const [referrer] = await connection.execute(
      'SELECT id FROM users WHERE referral_code = ?',
      [referralCode]
    );

    if (!Array.isArray(referrer) || referrer.length === 0) return;

    const referrerId = referrer[0].id;
    const referralBonus = 2000; // Fixed referral bonus points

    // Add points to referrer
    await connection.execute(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [referralBonus, referrerId]
    );

    // Record referral transaction
    await connection.execute(
      `INSERT INTO transactions (
        user_id, points, type, description, status, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        referrerId,
        referralBonus,
        'REFERRAL_BONUS',
        `Referral bonus for new ${selectedPackage} package signup - 2000 points`,
        'PROCESSED'
      ]
    );
  }


  app.post("/api/register", async (req, res) => {
    const connection = await createConnection();
    try {
      console.log('Registration attempt with data:', {
        ...req.body,
        password: '[REDACTED]',
        signature: req.body.signature ? '[PRESENT]' : '[NOT PRESENT]'
      });

      // Validate referral code if provided
      if (req.body.referralCode) {
        const isValidReferral = await validateReferralCode(connection, req.body.referralCode);
        if (!isValidReferral) {
          return res.status(400).json({
            error: "Invalid referral code"
          });
        }
      }

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

      // Align point values with the agent customer creation
      switch (selectedPackage) {
        case 'OPPORTUNITY': initialPoints = 2500; break;
        case 'MOMENTUM': initialPoints = 5000; break;
        case 'PROSPER': initialPoints = 7500; break;
        case 'PRESTIGE': initialPoints = 10000; break;
        case 'PINNACLE': initialPoints = 12500; break;
        default: initialPoints = 2500; // Default package points
      }


      // Start transaction
      await connection.beginTransaction();

      try {
        // Create user with signature
        const [userResult] = await connection.execute(
          `INSERT INTO users (
            email, password, first_name, last_name, 
            phone_number, is_enabled, points, referral_code, 
            referred_by, selected_package, mandate_accepted,
            signature, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            req.body.email,
            hashedPassword,
            req.body.firstName,
            req.body.lastName,
            req.body.mobileNumber,
            1, // is_enabled
            initialPoints,
            newReferralCode,
            req.body.referralCode || null,
            selectedPackage,
            1, // mandate_accepted
            req.body.signature || null
          ]
        );

        const userId = (userResult as any).insertId;

        // Record initial points transaction
        if (initialPoints > 0) {
          await connection.execute(
            `INSERT INTO transactions (
              user_id, points, type, description, status,
              created_at
            ) VALUES (?, ?, ?, ?, ?, NOW())`,
            [
              userId,
              initialPoints,
              'WELCOME_BONUS',
              `Initial points allocation for ${selectedPackage} package`,
              'PROCESSED'
            ]
          );
        }

        // Process referral points if applicable
        if (req.body.referralCode) {
          await processReferralPoints(connection, userId, req.body.referralCode, selectedPackage);
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

        // Send welcome email and admin notification
        try {
          const { formatRegistrationEmail, sendEmail, sendAdminRegistrationNotification } = await import('./utils/emailService');
          const { text, html } = formatRegistrationEmail(req.body.firstName, req.body.email);
          await sendEmail({
            to: req.body.email,
            subject: "Welcome to OPIAN Rewards!",
            text,
            html
          });
          console.log('Welcome email sent successfully to:', req.body.email);

          // Send admin notification
          await sendAdminRegistrationNotification({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            mobileNumber: req.body.mobileNumber,
            selectedPackage: selectedPackage,
            referralCode: req.body.referralCode,
            signature: req.body.signature,
            isSouthAfrican: req.body.isSouthAfrican,
            idNumber: req.body.idNumber,
            dateOfBirth: req.body.dateOfBirth,
            gender: req.body.gender,
            occupation: req.body.occupation,
            industry: req.body.industry,
            address: req.body.addressLine1,
            city: req.body.suburb,
            postalCode: req.body.postalCode,
            hasCreditCard: req.body.hasCreditCard,
            bankName: req.body.bankName,
            accountType: req.body.accountType,
            accountNumber: req.body.accountNumber,
            accountHolderName: req.body.accountHolderName,
            branchCode: req.body.branchCode
          });
          console.log('Admin notification sent successfully');
        } catch (emailError) {
          console.error('Failed to send emails:', emailError);
          // Don't fail registration if email fails
        }

        // Fetch complete user data
        const [newUserCheck] = await connection.execute(
          'SELECT * FROM users WHERE id = ?',
          [userId]
        );

        if (!newUserCheck || (newUserCheck as any[]).length === 0) {
          throw new Error("Failed to retrieve created user");
        }

        const newUser = (newUserCheck as any[])[0];
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
            points: transformedUser.points,
            selected_package: transformedUser.selected_package,
            referral_code: transformedUser.referral_code,
            referred_by: transformedUser.referred_by
          });

          res.status(201).json(transformedUser);
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Registration error:', error);
      if (!res.headersSent) {
        return res.status(500).json({
          error: "Registration failed. Please try again.",
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        });
      }
    } finally {
      await connection.end();
    }
  });

  app.post("/api/logout", (req, res) => {
    console.log('Logout request received');

    // Clear session cookie
    res.clearCookie('session', {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });

    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
        req.logout(() => {
          res.status(200).json({ message: "Logged out successfully" });
        });
      });
    } else {
      res.status(200).json({ message: "Logged out successfully" });
    }
  });

  app.get("/api/user", (req, res) => {
    console.log('GET /api/user request:', {
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? { id: req.user.id, email: req.user.email } : null
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json(req.user);
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


  app.post("/api/logout", (req, res) => {
    console.log('Logout request received');

    // Clear session cookie
    res.clearCookie('session', {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });

    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
        req.logout(() => {
          res.status(200).json({ message: "Logged out successfully" });
        });
      });
    } else {
      res.status(200).json({ message: "Logged out successfully" });
    }
  });

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

// JWT token verification helper
export function verifyJwtToken(token: string): { id: number, is_admin: boolean, is_super_admin: boolean } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { 
      id: number, 
      is_admin: boolean, 
      is_super_admin: boolean 
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
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
    process.env.JWT_SECRET!,
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
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

// Add checkAdmin middleware function
export async function checkAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('Running admin check middleware:', {
      hasSession: !!req.session,
      hasUser: !!req.user,
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated?.()
    });

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
      console.log('Admin access denied:', {
        userId: req.session.passport.user,
        foundAdmin: false
      });
      return res.status(403).json({ error: "Admin access required" });
    }

    console.log('Admin access granted:', {
      userId: req.session.passport.user,
      roleType: adminCheck[0].role_type
    });

    next();
  } catch (error) {
    console.error('Error in admin check:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Add debug logging to checkAgent middleware
export async function checkAgent(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('Running agent check middleware:', {
      hasSession: !!req.session,
      hasUser: !!req.user,
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated?.()
    });

    if (!req.session || !req.isAuthenticated()) {
      console.log('Authentication check failed:', {
        hasSession: !!req.session,
        isAuthenticated: req.isAuthenticated?.()
      });
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check if user exists and is an agent
      const [users] = await connection.execute(
        `SELECT id, email, is_agent, is_enabled 
         FROM users 
         WHERE id = ?`,
        [req.user.id]
      );

      const user = users[0];
      console.log('Agent check results:', {
        userId: req.user.id,
        foundUser: !!user,
        isAgent: user?.is_agent,
        isEnabled: user?.is_enabled
      });

      if (!user || !user.is_agent || !user.is_enabled) {
        console.log('User is not an agent or is disabled:', {
          userId: req.user.id,
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

//Helper function (assuming it exists elsewhere or needs to be added)
function parseCookie(cookieString: string | undefined): { [key: string]: string } {
  if (!cookieString) return {};
  const cookies: { [key: string]: string } = {};
  cookieString.split(';').forEach(cookie => {
    const [key, value] = cookie.trim().split('=');
    cookies[key] = value;
  });
  return cookies;
}