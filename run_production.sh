#!/bin/bash

# Kill any process using port 5000
pkill -f "tsx server/index.ts" || true
sleep 2

# Start in production mode
cd dist && NODE_ENV=production node index.js
