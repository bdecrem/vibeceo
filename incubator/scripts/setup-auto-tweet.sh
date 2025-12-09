#!/bin/bash
# Setup script for Token Tank auto-tweet scheduler
# Run this on your dev Mac to enable daily tweets at 12pm PT

PLIST_NAME="com.tokentank.auto-tweet.plist"
PLIST_SRC="$(dirname "$0")/$PLIST_NAME"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME"

case "$1" in
  install)
    echo "Installing auto-tweet scheduler..."

    # Copy plist to LaunchAgents
    cp "$PLIST_SRC" "$PLIST_DST"

    # Load the job
    launchctl load "$PLIST_DST"

    echo "✓ Installed and loaded $PLIST_NAME"
    echo "  Tweets will post daily at 12:00 PM PT"
    echo "  Logs: incubator/scripts/auto-tweet.log"
    echo ""
    echo "To test now: ./setup-auto-tweet.sh test"
    ;;

  uninstall)
    echo "Uninstalling auto-tweet scheduler..."

    # Unload the job
    launchctl unload "$PLIST_DST" 2>/dev/null

    # Remove plist
    rm -f "$PLIST_DST"

    echo "✓ Uninstalled $PLIST_NAME"
    ;;

  status)
    echo "Checking auto-tweet scheduler status..."
    if launchctl list | grep -q "com.tokentank.auto-tweet"; then
      echo "✓ Scheduler is LOADED"
      launchctl list | grep "com.tokentank.auto-tweet"
    else
      echo "✗ Scheduler is NOT loaded"
    fi
    ;;

  test)
    echo "Running auto-tweet manually..."
    cd "$(dirname "$0")/../../sms-bot"
    source .env.local
    export TOKENTANK_AUTO_TWEET=1
    npx tsx ../incubator/scripts/auto-tweet.ts
    ;;

  *)
    echo "Token Tank Auto-Tweet Scheduler"
    echo ""
    echo "Usage: $0 {install|uninstall|status|test}"
    echo ""
    echo "Commands:"
    echo "  install   - Install and start the daily scheduler (12pm PT)"
    echo "  uninstall - Stop and remove the scheduler"
    echo "  status    - Check if scheduler is running"
    echo "  test      - Run the auto-tweet script now (for testing)"
    ;;
esac
