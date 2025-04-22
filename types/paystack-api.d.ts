declare module 'paystack-api' {
  interface CustomerData {
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    metadata?: Record<string, any>;
  }

  interface TransactionInitData {
    amount: number;
    email: string;
    reference?: string;
    callback_url?: string;
    plan?: string;
    metadata?: Record<string, any>;
  }

  interface VerifyTransactionData {
    reference: string;
  }

  interface ListTransactionsData {
    customer?: string;
    status?: string;
    perPage?: number;
    page?: number;
  }

  interface PlanCreateData {
    name: string;
    amount: number;
    interval: string;
    description?: string;
  }

  interface SubscriptionCreateData {
    customer: string;
    plan: string;
  }

  interface ChargeAuthorizationData {
    email: string;
    amount: number;
    authorization_code: string;
  }

  interface PaystackResponse<T> {
    status: boolean;
    message: string;
    data: T;
  }

  interface PaystackAPI {
    customer: {
      create: (data: CustomerData) => Promise<PaystackResponse<any>>;
      list: (options?: any) => Promise<PaystackResponse<any[]>>;
      fetch: (customerId: string) => Promise<PaystackResponse<any>>;
      update: (customerId: string, data: Partial<CustomerData>) => Promise<PaystackResponse<any>>;
    };
    transaction: {
      initialize: (data: TransactionInitData) => Promise<PaystackResponse<any>>;
      verify: (data: VerifyTransactionData) => Promise<PaystackResponse<any>>;
      list: (options?: ListTransactionsData) => Promise<PaystackResponse<any[]>>;
      charge: (data: ChargeAuthorizationData) => Promise<PaystackResponse<any>>;
    };
    plan: {
      create: (data: PlanCreateData) => Promise<PaystackResponse<any>>;
      list: (options?: any) => Promise<PaystackResponse<any[]>>;
      fetch: (planId: string) => Promise<PaystackResponse<any>>;
    };
    subscription: {
      create: (data: SubscriptionCreateData) => Promise<PaystackResponse<any>>;
      list: (options?: any) => Promise<PaystackResponse<any[]>>;
      disable: (data: { code: string; token: string }) => Promise<PaystackResponse<any>>;
      enable: (data: { code: string; token: string }) => Promise<PaystackResponse<any>>;
    };
  }

  function Paystack(secretKey: string): PaystackAPI;
  export = Paystack;
}