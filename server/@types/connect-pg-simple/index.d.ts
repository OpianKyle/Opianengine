declare module 'connect-pg-simple' {
  import session from 'express-session';
  
  interface PgStoreOptions {
    pool?: any;
    tableName?: string;
    schemaName?: string;
    ttl?: number;
    createTableIfMissing?: boolean;
    disableTouch?: boolean;
    pruneSessionInterval?: number;
    errorLog?: (error: Error) => void;
  }
  
  function PgStore(session: typeof session): {
    new(options: PgStoreOptions): session.Store;
  };
  
  export = PgStore;
}