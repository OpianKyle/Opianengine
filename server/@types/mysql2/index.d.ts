declare module 'mysql2/promise' {
  import { Connection, Pool, PoolConnection, ConnectionOptions, PoolOptions, FieldPacket, OkPacket, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
  
  export interface QueryResult {
    [index: number]: any;
    length?: number;
    map?: <T>(callback: (item: any) => T) => T[];
    reduce?: <T>(callback: (accumulator: T, item: any) => T, initialValue: T) => T;
    affectedRows?: number;
    insertId?: number;
    changedRows?: number;
  }

  export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    is_agent: boolean;
    is_admin: boolean;
    is_super_admin: boolean;
    is_enabled: boolean;
    points: number;
    referral_code?: string;
    referred_by?: string;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    firstName?: string;
    lastName?: string;
  }

  export { Connection, Pool, PoolConnection, ConnectionOptions, PoolOptions, FieldPacket, OkPacket, ResultSetHeader, RowDataPacket };
}