declare module 'connect-pg-simple' {
  import { Store } from 'express-session';
  
  interface PgStoreOptions {
    pool?: any;
    schemaName?: string;
    tableName?: string;
    ttl?: number;
    createTableIfMissing?: boolean;
    pruneSessionInterval?: boolean | number;
    errorLog?: (error: Error) => void;
    checkPeriod?: number;
  }

  function connectPgSimple(session: any): {
    new (options: PgStoreOptions): Store;
  };
  
  export = connectPgSimple;
}