#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, Optional

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

try:
    from explore_agent import build_agent, session_from_dict, session_to_dict
except ImportError as exc:
    raise ImportError('Failed to import explore_agent module') from exc


def _load_state(path: Optional[str]) -> Optional[Dict[str, Any]]:
    if not path:
        return None
    try:
        data = Path(path).read_text(encoding="utf-8")
    except FileNotFoundError:
        return None
    except OSError:
        return None
    try:
        return json.loads(data)
    except json.JSONDecodeError:
        return None


def _save_state(path: Optional[str], state: Dict[str, Any]) -> None:
    if not path:
        return
    state_path = Path(path)
    try:
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass


def _emit(payload: Dict[str, Any]) -> None:
    json.dump(payload, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    sys.stdout.flush()


def main() -> None:
    parser = argparse.ArgumentParser(description="Explore agent runner")
    parser.add_argument("--command", required=True, help="Command text to execute")
    parser.add_argument(
        "--state-path",
        dest="state_path",
        help="Optional JSON file for persisting session context",
    )
    args = parser.parse_args()

    agent = build_agent()

    existing_state = _load_state(args.state_path)
    if existing_state:
        agent.session = session_from_dict(existing_state)

    try:
        message = agent.handle(args.command)
    except Exception as exc:  # pragma: no cover - integration safety
        _emit({
            "ok": False,
            "error": str(exc),
        })
        return

    new_state = session_to_dict(agent.session)
    _save_state(args.state_path, new_state)
    _emit({
        "ok": True,
        "message": message,
        "state": new_state,
    })


if __name__ == "__main__":
    main()

