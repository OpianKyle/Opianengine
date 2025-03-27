import 'express';

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      phone_number: string | null;
      is_agent: boolean;
      is_admin: boolean;
      is_super_admin: boolean;
      is_enabled: boolean;
      points: number;
      referral_code: string | null;
      referred_by: string | null;
      // Optional camelCase aliases
      isAdmin?: boolean;
      isSuperAdmin?: boolean;
      firstName?: string;
      lastName?: string;
    }
  }
}