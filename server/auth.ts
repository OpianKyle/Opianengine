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
      sameSite: 'lax',
      path: '/'
    },
    store: new MemoryStore({
      checkPeriod: 86400000
    }),
    resave: true,
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

        return done(null, transformedUser);
      } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
      } finally {
        await connection.end();
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
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

      done(null, transformedUser);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    } finally {
      await connection.end();
    }
  });

  return app;
}

export async function checkAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.session || !req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    const [adminCheck] = await connection.execute(
      'SELECT role_type FROM admin_users WHERE user_id = ?',
      [req.user?.id]
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
        [req.user?.id]
      );

      const user = users[0];
      console.log('Agent check results:', {
        userId: req.user?.id,
        foundUser: !!user,
        isAgent: user?.is_agent,
        isEnabled: user?.is_enabled
      });

      if (!user || !user.is_agent || !user.is_enabled) {
        console.log('User is not an agent or is disabled:', {
          userId: req.user?.id,
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
  console.log('Generating token for user:', {
    userId: user.id,
    isAdmin: user.is_admin,
    isSuperAdmin: user.is_super_admin
  });

  const token = jwt.sign(
    {
      id: user.id,
      isAdmin: user.is_admin,
      isSuperAdmin: user.is_super_admin
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

app.post("/api/login", (req, res, next) => {
    console.log('Login request received:', { email: req.body.email });

    passport.authenticate("local", (err: any, user: any | false, info: any) => {
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