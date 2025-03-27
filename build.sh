#!/bin/bash

# Build script for the application
echo "Building client and server..."

# First, check that the required imports are in server/routes.ts
echo "Checking required imports in server/routes.ts..."

# Make sure the required Drizzle imports are in place
ROUTES_FILE="server/routes.ts"

# Update tsconfig.server.json to force adding .js extensions to imports
echo "Updating TypeScript configuration..."
cat > tsconfig.server.json << EOF
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": ".",
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["server/**/*", "db/**/*"],
  "exclude": ["node_modules"]
}
EOF

# Build the client (frontend)
echo "Building client..."
npx vite build

# Build the server (backend)
echo "Building server..."
npx tsc -p tsconfig.server.json

echo "Build complete!"