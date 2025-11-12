#!/bin/bash
# Load env vars and run manual AIR report

cd "$(dirname "$0")/.."
set -a
source .env.local
set +a
node scripts/manual-air-report.js
