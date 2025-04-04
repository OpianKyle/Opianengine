#!/bin/bash
echo "Building the application..."
vite build
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
echo "Starting the application in production mode..."
PORT=10000 NODE_ENV=production node --require dotenv/config dist/index.js