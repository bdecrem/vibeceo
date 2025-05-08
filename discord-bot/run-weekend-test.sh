#!/bin/bash

# Script to test the weekend mode functionality

echo "Building project..."
npm run build

# Run the test
echo "Running weekend mode test..."
node test-weekend.js 