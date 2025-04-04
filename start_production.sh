#!/bin/bash

echo "Building application for production..."
npm run build

echo "Starting application in production mode..."
NODE_ENV=production node dist/index.js