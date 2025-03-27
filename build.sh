#!/bin/bash

# Create build directory if it doesn't exist
mkdir -p dist/server

echo "Building client..."
# Build the client app
npx vite build

echo "Transpiling server code..."
# Compile server TypeScript files
npx tsc --project tsconfig.server.json || {
  echo "Creating tsconfig.server.json..."
  cat > tsconfig.server.json << EOF
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2020",
    "outDir": "dist/server",
    "rootDir": ".",
    "esModuleInterop": true
  },
  "include": ["server/**/*.ts", "db/**/*.ts"],
  "exclude": ["node_modules", "client"]
}
EOF
  npx tsc --project tsconfig.server.json
}

echo "Copying .env file to dist directory..."
cp .env dist/

echo "Build completed. Run 'NODE_ENV=production node dist/server/server/index.js' to start the production server."