#!/bin/bash

# Create build directory if it doesn't exist
mkdir -p dist/server
mkdir -p dist/server/@types

echo "Building client..."
# Build the client app
npx vite build

echo "Transpiling server code..."
# Use the updated tsconfig.server.json with proper module resolution settings
npx tsc --project tsconfig.server.json || {
  echo "TypeScript compilation failed. Check for errors in the server code."
  exit 1
}

echo "Copying .env file to dist directory..."
cp .env dist/

# Fix imports in generated JavaScript files (add .js extension)
echo "Processing import statements in JavaScript files..."
find dist/server -type f -name "*.js" -exec sed -i 's/from "\(\..*\)"/from "\1.js"/g' {} \;
find dist/server -type f -name "*.js" -exec sed -i "s/from '\(\..*\)'/from '\1.js'/g" {} \;

# Create type declarations to resolve issues
echo "Creating custom type declarations..."

# express-fileupload
mkdir -p dist/server/@types/express-fileupload
cat > dist/server/@types/express-fileupload/index.d.ts << EOF
declare module 'express-fileupload' {
  import { NextFunction, Request, Response } from 'express';
  
  namespace fileUpload {
    interface FileUploadOptions {
      createParentPath?: boolean;
      limits?: {
        fileSize?: number;
      };
    }
    
    interface UploadedFile {
      name: string;
      mv(path: string, callback: (err?: any) => void): void;
      mv(path: string): Promise<void>;
      encoding: string;
      mimetype: string;
      data: Buffer;
      tempFilePath: string;
      truncated: boolean;
      size: number;
      md5: string;
    }
  }
  
  function fileUpload(options?: fileUpload.FileUploadOptions): (req: Request, res: Response, next: NextFunction) => void;
  
  export = fileUpload;
}
EOF

# express-session
mkdir -p dist/server/@types/express-session
cat > dist/server/@types/express-session/index.d.ts << EOF
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
EOF

# mysql2 types
mkdir -p dist/server/@types/mysql2
cat > dist/server/@types/mysql2/index.d.ts << EOF
declare module 'mysql2/promise' {
  import * as mysql from 'mysql2';
  
  export function createConnection(config: any): Promise<any>;
  export function createPool(config: any): any;
  export * from 'mysql2';
}
EOF

echo "Build completed. Run 'NODE_ENV=production node --require dotenv/config dist/server/server/index.js' to start the production server."