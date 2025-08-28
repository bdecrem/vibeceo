#!/bin/bash

# Quick start/stop/status script for WebtoysOS Edit Agent

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
STOP_FILE="$SCRIPT_DIR/STOP-EDIT-AGENT.txt"

case "$1" in
    start)
        if [ -f "$STOP_FILE" ]; then
            rm "$STOP_FILE"
            echo "✅ Edit agent ENABLED - will run on next cron cycle (within 2 minutes)"
        else
            echo "ℹ️  Edit agent is already enabled"
        fi
        ;;
    
    stop)
        touch "$STOP_FILE"
        echo "🛑 Edit agent DISABLED - created STOP-EDIT-AGENT.txt"
        ;;
    
    status)
        echo "🤖 WebtoysOS Edit Agent Status"
        echo "==============================="
        
        # Check if cron is installed
        if crontab -l 2>/dev/null | grep -q "execute-open-issue.js"; then
            echo "✅ Cron job: INSTALLED"
        else
            echo "❌ Cron job: NOT INSTALLED (run ./setup-edit-agent-cron.sh)"
        fi
        
        # Check if agent is enabled
        if [ -f "$STOP_FILE" ]; then
            echo "🛑 Agent: DISABLED (STOP-EDIT-AGENT.txt exists)"
        else
            echo "✅ Agent: ENABLED"
        fi
        
        # Check last run
        if [ -f "$SCRIPT_DIR/edit-agent.log" ]; then
            echo ""
            echo "📊 Last 5 log entries:"
            tail -5 "$SCRIPT_DIR/edit-agent.log"
        fi
        ;;
    
    test)
        echo "🧪 Running edit agent manually..."
        cd "$SCRIPT_DIR"
        ISSUE_TRACKER_APP_ID=toybox-direct-updates /usr/local/bin/node execute-open-issue.js
        ;;
    
    *)
        echo "Usage: $0 {start|stop|status|test}"
        echo ""
        echo "  start  - Enable the edit agent"
        echo "  stop   - Disable the edit agent"
        echo "  status - Show current status"
        echo "  test   - Run once manually"
        exit 1
        ;;
esac