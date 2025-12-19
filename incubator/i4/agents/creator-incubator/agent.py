#!/usr/bin/env python3
"""
Creator Incubator Agent

Discovers unique content creator concepts for Twitter/X.
Every 5 minutes: research → ideate → generate sample posts → save.

Usage:
    python agent.py              # Run once
    python agent.py --continuous # Run every 5 minutes
    python agent.py --count 10   # Run 10 times then stop
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

# Add parent paths for imports if needed
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / "sms-bot"))

try:
    from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient
except ImportError as e:
    print(f"Error: claude-agent-sdk not installed. Run: pip install claude-agent-sdk")
    print(f"Details: {e}")
    sys.exit(1)


class CreatorIncubator:
    """Agent that generates content creator concepts."""

    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.config_path = self.base_dir / "config.json"
        self.task_path = self.base_dir / "task.txt"
        self.output_dir = self.base_dir / "output"
        self.logs_dir = self.base_dir / "logs"

        # Ensure directories exist
        self.output_dir.mkdir(exist_ok=True)
        self.logs_dir.mkdir(exist_ok=True)

        self.config = self._load_config()
        self.task = self._load_task()

    def _load_config(self) -> dict:
        """Load configuration from config.json."""
        if self.config_path.exists():
            with open(self.config_path) as f:
                return json.load(f)
        return {
            "interval_minutes": 5,
            "run_count": 0,
            "last_run": None
        }

    def _save_config(self):
        """Save configuration to config.json."""
        with open(self.config_path, "w") as f:
            json.dump(self.config, f, indent=2)

    def _load_task(self) -> str:
        """Load task instructions from task.txt."""
        if self.task_path.exists():
            with open(self.task_path) as f:
                return f.read()
        return "Generate a unique content creator concept for Twitter."

    def _log(self, message: str, level: str = "INFO"):
        """Log a message to console and log file."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_line = f"[{timestamp}] [{level}] {message}"
        print(log_line)

        # Also write to daily log file
        log_file = self.logs_dir / f"{datetime.now().strftime('%Y-%m-%d')}.log"
        with open(log_file, "a") as f:
            f.write(log_line + "\n")

    async def run_once(self) -> Optional[dict]:
        """Run one iteration of the creator incubator."""
        self._log("=" * 60)
        self._log("CREATOR INCUBATOR: Starting new run")
        self._log("=" * 60)

        # Generate timestamp for this run
        timestamp = datetime.now().strftime("%Y-%m-%d-%H%M")

        # Build the prompt
        prompt = f"""You are the Creator Incubator agent. Your task is to discover and fully design
a unique content creator concept for Twitter/X.

{self.task}

IMPORTANT OUTPUT FORMAT:
========================

You must output your results in a VERY SPECIFIC format so they can be parsed and saved.

First, do your research by searching the web for:
- Trending Reddit communities and topics
- Viral Twitter content and formats
- Underserved niches with passionate audiences

Then generate your concept and sample posts.

OUTPUT YOUR FINAL RESULT LIKE THIS:

===CONCEPT_START===
Name: [short concept name, lowercase with hyphens, e.g., "micro-poet" or "fake-album-covers"]
Type: [creator type]
Angle: [what makes this unique]
Audience: [who would follow]
Format: [text, image, thread, etc.]
Frequency: [posts per day recommendation]
AccountNames: [3 possible Twitter handle ideas]

Description:
[2-3 paragraph description of the concept]

WhyItWorks:
[bullet points on why this could succeed]
===CONCEPT_END===

===POSTS_START===
---POST 1---
Text: [the actual tweet, under 280 chars]
ImagePrompt: [if visual, detailed prompt for image generation, otherwise "none"]
Why: [one line on why this resonates]

---POST 2---
Text: [tweet]
ImagePrompt: [prompt or "none"]
Why: [reason]

[... continue for all 10 posts ...]

---POST 10---
Text: [tweet]
ImagePrompt: [prompt or "none"]
Why: [reason]
===POSTS_END===

NOW BEGIN. Search, think, then output in the exact format above.
"""

        # Configure Claude Agent SDK
        options = ClaudeAgentOptions(
            model="claude-sonnet-4-20250514",
            permission_mode="acceptEdits",
            allowed_tools=["WebSearch", "Read", "Write"],
        )

        try:
            result_text = ""

            async with ClaudeSDKClient(options=options) as client:
                await client.query(prompt)

                async for message in client.receive_response():
                    # Extract text from message
                    content = getattr(message, "content", None)
                    if isinstance(content, list):
                        for block in content:
                            text = getattr(block, "text", None)
                            if text:
                                result_text += text
                    elif isinstance(content, str):
                        result_text += content

            if not result_text:
                self._log("No response from agent", "ERROR")
                return None

            # Parse the result
            concept = self._parse_concept(result_text)
            posts = self._parse_posts(result_text)

            if not concept:
                self._log("Failed to parse concept from response", "ERROR")
                self._log(f"Response preview: {result_text[:500]}...", "DEBUG")
                return None

            # Create output folder
            concept_name = concept.get("name", "unknown-concept")
            folder_name = f"{timestamp}-{concept_name}"
            concept_dir = self.output_dir / folder_name
            concept_dir.mkdir(exist_ok=True)
            (concept_dir / "posts").mkdir(exist_ok=True)

            # Save README.md
            readme_content = self._generate_readme(concept, posts)
            with open(concept_dir / "README.md", "w") as f:
                f.write(readme_content)

            # Save individual posts
            for i, post in enumerate(posts, 1):
                post_file = concept_dir / "posts" / f"{i:02d}.md"
                post_content = f"""# Post {i}

## Tweet
{post.get('text', '')}

## Image Prompt
{post.get('image_prompt', 'none')}

## Why It Works
{post.get('why', '')}
"""
                with open(post_file, "w") as f:
                    f.write(post_content)

            # Update config
            self.config["run_count"] = self.config.get("run_count", 0) + 1
            self.config["last_run"] = datetime.now().isoformat()
            self._save_config()

            self._log(f"SUCCESS: Generated concept '{concept_name}' with {len(posts)} posts")
            self._log(f"Output saved to: {concept_dir}")

            return {
                "concept": concept,
                "posts": posts,
                "output_dir": str(concept_dir)
            }

        except Exception as e:
            self._log(f"Agent error: {e}", "ERROR")
            import traceback
            traceback.print_exc()
            return None

    def _parse_concept(self, text: str) -> Optional[dict]:
        """Parse concept section from agent output."""
        try:
            if "===CONCEPT_START===" not in text or "===CONCEPT_END===" not in text:
                return None

            concept_text = text.split("===CONCEPT_START===")[1].split("===CONCEPT_END===")[0]

            concept = {}
            lines = concept_text.strip().split("\n")

            current_section = None
            section_content = []

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                if line.startswith("Name:"):
                    concept["name"] = line.replace("Name:", "").strip()
                elif line.startswith("Type:"):
                    concept["type"] = line.replace("Type:", "").strip()
                elif line.startswith("Angle:"):
                    concept["angle"] = line.replace("Angle:", "").strip()
                elif line.startswith("Audience:"):
                    concept["audience"] = line.replace("Audience:", "").strip()
                elif line.startswith("Format:"):
                    concept["format"] = line.replace("Format:", "").strip()
                elif line.startswith("Frequency:"):
                    concept["frequency"] = line.replace("Frequency:", "").strip()
                elif line.startswith("AccountNames:"):
                    concept["account_names"] = line.replace("AccountNames:", "").strip()
                elif line.startswith("Description:"):
                    current_section = "description"
                    section_content = []
                elif line.startswith("WhyItWorks:"):
                    if current_section == "description":
                        concept["description"] = "\n".join(section_content)
                    current_section = "why_it_works"
                    section_content = []
                elif current_section:
                    section_content.append(line)

            # Save last section
            if current_section and section_content:
                concept[current_section] = "\n".join(section_content)

            return concept if concept.get("name") else None

        except Exception as e:
            print(f"Parse error: {e}")
            return None

    def _parse_posts(self, text: str) -> list:
        """Parse posts section from agent output."""
        posts = []

        try:
            if "===POSTS_START===" not in text or "===POSTS_END===" not in text:
                return posts

            posts_text = text.split("===POSTS_START===")[1].split("===POSTS_END===")[0]

            # Split by post markers
            post_chunks = posts_text.split("---POST")[1:]  # Skip first empty chunk

            for chunk in post_chunks:
                post = {}
                lines = chunk.strip().split("\n")

                for line in lines:
                    line = line.strip()
                    if line.startswith("Text:"):
                        post["text"] = line.replace("Text:", "").strip()
                    elif line.startswith("ImagePrompt:"):
                        post["image_prompt"] = line.replace("ImagePrompt:", "").strip()
                    elif line.startswith("Why:"):
                        post["why"] = line.replace("Why:", "").strip()

                if post.get("text"):
                    posts.append(post)

        except Exception as e:
            print(f"Posts parse error: {e}")

        return posts

    def _generate_readme(self, concept: dict, posts: list) -> str:
        """Generate README.md content for a concept."""
        return f"""# {concept.get('name', 'Unknown Concept')}

**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M')}

## Overview

- **Type**: {concept.get('type', 'N/A')}
- **Unique Angle**: {concept.get('angle', 'N/A')}
- **Target Audience**: {concept.get('audience', 'N/A')}
- **Content Format**: {concept.get('format', 'N/A')}
- **Posting Frequency**: {concept.get('frequency', 'N/A')}
- **Account Name Ideas**: {concept.get('account_names', 'N/A')}

## Description

{concept.get('description', 'No description provided.')}

## Why It Could Work

{concept.get('why_it_works', 'No analysis provided.')}

## Sample Posts

This concept includes {len(posts)} sample posts. See the `posts/` folder for details.

### Quick Preview

"""
        # Add first 3 posts as preview
        for i, post in enumerate(posts[:3], 1):
            return f"""
**Post {i}**: {post.get('text', 'N/A')[:100]}...
"""

    async def run_continuous(self, max_runs: Optional[int] = None):
        """Run the agent continuously at the configured interval."""
        interval = self.config.get("interval_minutes", 5)
        run_count = 0

        self._log(f"Starting continuous mode (interval: {interval} minutes)")
        if max_runs:
            self._log(f"Will stop after {max_runs} runs")

        while True:
            result = await self.run_once()
            run_count += 1

            if max_runs and run_count >= max_runs:
                self._log(f"Completed {run_count} runs. Stopping.")
                break

            self._log(f"Sleeping for {interval} minutes...")
            await asyncio.sleep(interval * 60)


def main():
    parser = argparse.ArgumentParser(description="Creator Incubator Agent")
    parser.add_argument("--continuous", action="store_true", help="Run continuously")
    parser.add_argument("--count", type=int, help="Number of runs (with --continuous)")
    args = parser.parse_args()

    agent = CreatorIncubator()

    if args.continuous:
        asyncio.run(agent.run_continuous(max_runs=args.count))
    else:
        asyncio.run(agent.run_once())


if __name__ == "__main__":
    main()
