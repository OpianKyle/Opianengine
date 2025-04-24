export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  is_super_admin: boolean;
  is_agent: boolean;
  is_enabled: boolean;
  points: number;
  created_at: string;
  profile_image?: string;
  referral_code?: string;
  referredBy?: string;
  // Subscription-related fields
  selectedPackage?: string;
  subscription_status?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  paystack_customer_code?: string;
  paystack_subscription_code?: string;
  paystack_email_token?: string;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
  referral_code?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirm_password: string;
}

export interface RequestResetData {
  email: string;
}

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  link?: string;
}

export interface ReferralLead {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: 'NEW' | 'CONTACTED' | 'SIGNED_UP' | 'NOT_INTERESTED';
  notes?: string;
  referrer_id: number;
  created_at: string;
  signed_up_user_id?: number;
}

export interface SubscriptionDetails {
  code: string;
  status: string;
  amount: number;
  startDate: string;
  endDate: string;
  nextPaymentDate: string;
  plan: {
    name: string;
    interval: string;
  };
}