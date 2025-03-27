#!/bin/bash

# Create build directory if it doesn't exist
mkdir -p dist/server

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

# Create a declaration file for express-fileupload if needed
if [ ! -f "dist/server/@types/express-fileupload/index.d.ts" ]; then
  echo "Creating express-fileupload type declaration..."
  mkdir -p dist/server/@types/express-fileupload
  cat > dist/server/@types/express-fileupload/index.d.ts << EOF
declare module 'express-fileupload';
EOF
fi

echo "Build completed. Run 'NODE_ENV=production node dist/server/server/index.js' to start the production server."