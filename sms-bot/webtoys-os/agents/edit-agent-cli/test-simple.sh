#!/bin/bash
curl -X POST https://03ffa53d166c.ngrok.app/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"new_issue","issue":{"id":"simple-test","content_data":{"title":"Test","description":"Add a comment that says HELLO WORLD at the top of the HTML","status":"open"}}}'