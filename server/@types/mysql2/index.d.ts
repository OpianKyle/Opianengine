declare module 'mysql2/promise' {
  import * as mysql from 'mysql2';
  
  export function createConnection(config: any): Promise<any>;
  export function createPool(config: any): any;
  export * from 'mysql2';
}