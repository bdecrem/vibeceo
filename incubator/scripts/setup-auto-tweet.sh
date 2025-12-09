#!/bin/bash
# Setup script for Token Tank auto-tweet schedulers
# Run this on your dev Mac to enable daily tweets
#   - 8am PT: Morning tweet (music, vibes, news commentary)
#   - 12pm PT: Activity tweet (agent progress or news fallback)

SCRIPT_DIR="$(dirname "$0")"

ACTIVITY_PLIST="com.tokentank.auto-tweet.plist"
MORNING_PLIST="com.tokentank.morning-tweet.plist"

install_plist() {
  local name=$1
  local src="$SCRIPT_DIR/$name"
  local dst="$HOME/Library/LaunchAgents/$name"

  if [ ! -f "$src" ]; then
    echo "✗ Missing $name"
    return 1
  fi

  cp "$src" "$dst"
  launchctl load "$dst"
  echo "✓ Installed $name"
}

uninstall_plist() {
  local name=$1
  local dst="$HOME/Library/LaunchAgents/$name"

  launchctl unload "$dst" 2>/dev/null
  rm -f "$dst"
  echo "✓ Uninstalled $name"
}

check_plist() {
  local name=$1
  local label="${name%.plist}"

  if launchctl list | grep -q "$label"; then
    echo "✓ $name is LOADED"
  else
    echo "✗ $name is NOT loaded"
  fi
}

case "$1" in
  install)
    echo "Installing Token Tank tweet schedulers..."
    echo ""
    install_plist "$MORNING_PLIST"
    install_plist "$ACTIVITY_PLIST"
    echo ""
    echo "Schedule:"
    echo "  8:00 AM PT  - Morning tweet (music, vibes, news)"
    echo "  12:00 PM PT - Activity tweet (agent progress)"
    echo ""
    echo "Logs:"
    echo "  incubator/scripts/morning-tweet.log"
    echo "  incubator/scripts/auto-tweet.log"
    echo ""
    echo "To test: ./setup-auto-tweet.sh test-morning"
    echo "         ./setup-auto-tweet.sh test-activity"
    ;;

  uninstall)
    echo "Uninstalling Token Tank tweet schedulers..."
    uninstall_plist "$MORNING_PLIST"
    uninstall_plist "$ACTIVITY_PLIST"
    ;;

  status)
    echo "Token Tank tweet scheduler status:"
    echo ""
    check_plist "$MORNING_PLIST"
    check_plist "$ACTIVITY_PLIST"
    ;;

  test-morning)
    echo "Running morning tweet manually..."
    cd "$SCRIPT_DIR/../../sms-bot"
    source .env.local
    export TOKENTANK_AUTO_TWEET=1
    npx tsx ../incubator/scripts/auto-tweet.ts morning
    ;;

  test-activity|test)
    echo "Running activity tweet manually..."
    cd "$SCRIPT_DIR/../../sms-bot"
    source .env.local
    export TOKENTANK_AUTO_TWEET=1
    npx tsx ../incubator/scripts/auto-tweet.ts
    ;;

  *)
    echo "Token Tank Auto-Tweet Scheduler"
    echo ""
    echo "Usage: $0 {install|uninstall|status|test-morning|test-activity}"
    echo ""
    echo "Commands:"
    echo "  install       - Install both daily schedulers"
    echo "  uninstall     - Stop and remove both schedulers"
    echo "  status        - Check if schedulers are running"
    echo "  test-morning  - Run the 8am morning tweet now"
    echo "  test-activity - Run the 12pm activity tweet now"
    echo ""
    echo "Schedule:"
    echo "  8:00 AM PT  - Morning tweet (music, vibes, news commentary)"
    echo "  12:00 PM PT - Activity tweet (agent progress or news)"
    ;;
esac
