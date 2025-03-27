declare module 'memorystore' {
  import session from 'express-session';
  
  interface MemoryStoreOptions {
    checkPeriod?: number;
    max?: number;
    ttl?: number;
    dispose?: (key: string, value: any) => void;
    stale?: boolean;
    noDisposeOnSet?: boolean;
    serializer?: {
      parse(value: string): any;
      stringify(value: any): string;
    };
  }
  
  class MemoryStore extends session.Store {
    constructor(options?: MemoryStoreOptions);
  }
  
  function MemoryStoreFactory(session: typeof session): {
    new(options?: MemoryStoreOptions): MemoryStore;
  };
  
  export = MemoryStoreFactory;
}