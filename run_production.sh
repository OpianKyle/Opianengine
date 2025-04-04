#!/bin/bash

# Kill any process using port 5000
pkill -f "tsx server/index.ts" || true
sleep 2

# Start in production mode
NODE_ENV=production node dist/server/server/index.js
