#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

# Check if the bot process is running
if ! pgrep -f "npm run discord-bot" > /dev/null; then
    echo "$(date): Bot is not running. Restarting..."
    # Start the bot in the background
    nohup ./start-bot.sh > bot.log 2>&1 &
    echo "$(date): Bot restarted. Check bot.log for details."
else
    echo "$(date): Bot is running."
fi 