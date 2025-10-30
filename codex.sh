#!/usr/bin/env bash
# Prepend agents.md to your prompt and pass as Codex's positional PROMPT.

set -euo pipefail

CODEX_CMD="${CODEX_CMD:-codex}"        # override if your command is different, e.g. "codex run"
AGENTS_FILE="${AGENTS_FILE:-agents.md}"

# Load agents.md if present
AGENTS=""
if [[ -f "$AGENTS_FILE" ]]; then
  AGENTS="$(cat "$AGENTS_FILE")"
fi

# Get the user prompt: args take priority; else read stdin (for piping)
if [[ $# -gt 0 ]]; then
  USER_PROMPT="$*"
elif [[ ! -t 0 ]]; then
  USER_PROMPT="$(cat)"
else
  echo "Usage: $0 \"your prompt\"  (or pipe a prompt to stdin)" >&2
  exit 2
fi

# Separator so the model treats agents.md as system-style rules
DELIM=$'\n\n---\n(Above are behavior rules. Follow silently.)\n---\n\n'

COMBINED_PROMPT="${AGENTS}${AGENTS:+$DELIM}${USER_PROMPT}"

# Exec Codex with the combined text as the single positional PROMPT
exec $CODEX_CMD "$COMBINED_PROMPT"