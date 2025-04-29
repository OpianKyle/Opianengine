#!/bin/bash

# This script is designed to be run by a cron job on the first day of each month
# Recommended cron entry (runs at 1:00 AM on the 1st of each month):
# 0 1 1 * * /path/to/cron-monthly-renewals.sh >> /path/to/renewal-logs.log 2>&1

# Determine the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to the project root directory
cd "$ROOT_DIR" || { echo "Failed to change to project root directory"; exit 1; }

# Log the start of the process
echo "========================================"
echo "Starting monthly renewal processing at $(date)"
echo "========================================"

# Check if it's the first day of the month
DAY_OF_MONTH=$(date +%d)

if [ "$DAY_OF_MONTH" -eq "01" ] || [ "$1" == "--force" ]; then
  # Run the renewal processing script
  node "$SCRIPT_DIR/process-monthly-renewals.js"
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Monthly renewal processing completed successfully"
  else
    echo "❌ Monthly renewal processing failed with exit code: $EXIT_CODE"
  fi
else
  echo "Not the first day of the month. Skipping processing."
  echo "Run with --force to override this check."
fi

echo "Monthly renewal processing finished at $(date)"
echo "========================================"