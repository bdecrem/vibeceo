#!/bin/bash
# Local dev wrapper — loads .env before starting (for machines that need webpack mode)
# This file is gitignored and won't affect other machines or production.
exec env IS_WEBPACK_TEST=1 npm run dev
