// Environment variables are handled in server/index.ts,
// but this file now provides configuration helpers

// Check if running in development mode
export const isDevelopment = process.env.NODE_ENV === 'development';

// Check if we should use external database (default true) or allow fallback to dummy data
export const useExternalDatabase = process.env.USE_DUMMY_DATA !== 'true';

// Mock User for development testing
export interface MockUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_admin: boolean;
  is_super_admin: boolean;
  is_agent: boolean;
  is_enabled: boolean;
  points: number;
  referral_code: string | null;
  referred_by: string | null;
}

// Development mode helpers
export const getDevelopmentUser = (role: 'admin' | 'agent' | 'customer' = 'customer'): MockUser => {
  if (role === 'admin') {
    return {
      id: 1,
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      phone_number: '+27123456789',
      is_admin: true,
      is_super_admin: true, 
      is_agent: false,
      is_enabled: true,
      points: 10000,
      referral_code: 'ADMIN123',
      referred_by: null
    };
  } else if (role === 'agent') {
    return {
      id: 2,
      email: 'agent@example.com',
      first_name: 'Agent',
      last_name: 'User',
      phone_number: '+27123456789',
      is_admin: false,
      is_super_admin: false,
      is_agent: true,
      is_enabled: true,
      points: 5000,
      referral_code: 'AGENT123',
      referred_by: null
    };
  } else {
    return {
      id: 3,
      email: 'customer@example.com',
      first_name: 'Customer',
      last_name: 'User',
      phone_number: '+27123456789',
      is_admin: false,
      is_super_admin: false,
      is_agent: false,
      is_enabled: true,
      points: 2500,
      referral_code: 'CUST123',
      referred_by: null
    };
  }
};