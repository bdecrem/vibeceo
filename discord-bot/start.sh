#!/bin/bash

# Start the Next.js development server in the background
npm run dev &

# Wait a moment for the Next.js server to start
sleep 5

# Start the Discord bot
npm run start:bot:dev

# If either process exits, kill the other
trap "kill 0" EXIT 