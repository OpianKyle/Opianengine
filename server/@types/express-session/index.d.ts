import 'express-session';

declare module 'express-session' {
  interface SessionData {
    passport?: {
      user: number | string;
    };
    points?: number;
    user?: any;
  }
  
  interface MemoryStore {
    new(options?: { checkPeriod?: number }): MemoryStore;
  }
}