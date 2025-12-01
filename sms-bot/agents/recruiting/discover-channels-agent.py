#!/usr/bin/env python3
"""
Recruiting Channel Discovery Agent
Uses claude-agent-sdk to search for REAL candidate examples on various platforms
"""

import argparse
import asyncio
import json
from datetime import datetime
from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions, query

PROMPT_TEMPLATE = """
You are a talent sourcing expert. Find 5-8 SPECIFIC MINEABLE CHANNELS with REAL VERIFIED EXAMPLES of candidates.

**EFFICIENCY IS CRITICAL - MINIMIZE WEB SEARCHES:**
- Do MAXIMUM 3-4 strategic web searches total (not per channel!)
- Use broad searches that return multiple candidates at once
- Focus on platforms where candidates are most likely to be found
- Once you find 1-2 good examples per channel type, move on - don't keep searching

**YOU HAVE WEB SEARCH ACCESS - USE IT SPARINGLY!**

RECRUITING QUERY: {refined_query}

{company_context}

{additional_constraints}

Your task:
1. **FIRST: Identify the best platforms/channels for this specific job/industry**
   - Consider: What platforms do people in this profession/industry use?
   - Examples: Software engineers → GitHub, Stack Overflow, dev communities
   - Examples: Designers → Dribbble, Behance, portfolio sites
   - Examples: Marketers → LinkedIn, Twitter, marketing communities
   - Examples: Researchers → arXiv, academic networks, research platforms
   - Choose 5-8 channel types that are SPECIFICALLY relevant to this role/industry

2. Use 3-4 STRATEGIC web searches to find examples across multiple channels at once
3. For each search result, extract 1-2 real people who fit the criteria
4. Return ONLY channels where you found real verified examples

CRITICAL STEPS - BE EFFICIENT:

EFFICIENT SEARCH STRATEGY:
- Based on the job requirements, identify the 2-3 most relevant platforms
- Search 1: Target the PRIMARY platform for this profession (e.g., GitHub for devs, Dribbble for designers)
- Search 2: Target the SECONDARY platform (e.g., LinkedIn for professionals, portfolio sites)
- Search 3: Target community/niche platforms specific to this industry
- Search 4 (if needed): One more targeted search for any missing channel types

For each search result:
- Extract 1-2 real people who clearly fit the criteria
- Include their actual profile URL (platform-specific format)
- Don't do follow-up searches for individual profiles - use what you find

**ABSOLUTELY CRITICAL - MANDATORY REQUIREMENTS:**
- EVERY channel MUST have a real example with a working URL
- The example MUST demonstrate meeting ALL the criteria above (recruiting query + any additional constraints)
- DO NOT make up fake URLs
- DO NOT guess plausible-looking profiles
- DO NOT include ANY channel without a verified real example that meets the constraints
- Use WebSearch to find actual people - if you can't find them, SKIP that channel type
- Each channel needs exactly ONE real example (name + URL + description)
- If you can only find fewer channels with real examples that meet constraints, return what you found (aim for 5-8 but quality over quantity)
- NEVER use placeholder text like "Will mine this channel" - FIND ACTUAL PEOPLE
- The example.url MUST be a direct link where the user can verify the person meets the criteria
- If additional constraints mention "actual work", "portfolio", "GitHub repos", etc., the example.url MUST link to where that work can be seen

USE THE WRITE TOOL to save your findings to: {output_path}

Output format (JSON):
{{
  "status": "success",
  "channels": [
    {{
      "name": "Platform/Channel name (e.g., 'GitHub Go developers', 'Dribbble UI designers', 'LinkedIn marketing professionals')",
      "channelType": "platform" | "community" | "job-board" | "portfolio-site" | "social-network" | "other",
      "description": "How to mine this channel for candidates",
      "searchQuery": "Search query to find candidates in this channel",
      "platformUrl": "Base URL for the platform (optional)",
      "example": {{
        "name": "Real person's name or handle",
        "url": "Direct link to their profile",
        "description": "Brief description showing they meet the criteria"
      }},
      "score": 9,
      "reason": "Why this channel is good for finding these candidates"
    }}
  ]
}}

CRITICAL: Every channel MUST have example.name, example.url, and example.description filled in with REAL data from WebSearch!
"""


async def discover_channels(
    refined_query: str,
    company_context: str,
    output_dir: Path,
    additional_constraints: list = None
) -> dict:
    """Run the channel discovery agent with web search"""

    # Prepare output path - make it absolute to avoid path issues
    output_dir = output_dir.resolve()  # Convert to absolute path
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = output_dir / f"channels_{timestamp}.json"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"[Channel Discovery Agent] Output directory (absolute): {output_dir}", flush=True)
    print(f"[Channel Discovery Agent] Output file (absolute): {output_file}", flush=True)

    # Format additional constraints
    constraints_text = ""
    if additional_constraints and len(additional_constraints) > 0:
        constraints_text = "\n**ADDITIONAL CONSTRAINTS (examples MUST meet these):**\n"
        for i, constraint in enumerate(additional_constraints, 1):
            constraints_text += f"{i}. {constraint}\n"

    # Format prompt
    prompt = PROMPT_TEMPLATE.format(
        refined_query=refined_query,
        company_context=f"\nCOMPANY CONTEXT: {company_context}" if company_context else "",
        additional_constraints=constraints_text,
        output_path=str(output_file)
    )

    # Run agent with web search
    try:
        print(f"[Channel Discovery Agent] Starting search for: {refined_query}", flush=True)
        
        # Check if API key is available
        import os
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is not set")
        print(f"[Channel Discovery Agent] API key found: {api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else '***'}", flush=True)

        # Use the correct API with allowed_tools
        # Use absolute path for cwd to ensure Write tool writes to correct location
        options = ClaudeAgentOptions(
            permission_mode='acceptEdits',
            allowed_tools=['Read', 'Write', 'WebSearch', 'WebFetch'],
            cwd=str(output_dir.absolute()),
        )

        print(f"[Channel Discovery Agent] Calling query() with prompt length: {len(prompt)}", flush=True)
        print(f"[Channel Discovery Agent] Output file will be: {output_file}", flush=True)
        
        # Run the agent and consume the async iterator
        message_count = 0
        try:
            print(f"[Channel Discovery Agent] Starting async iteration...", flush=True)
            async for message in query(prompt=prompt, options=options):
                message_count += 1
                print(f"[Channel Discovery Agent] Received message #{message_count}: {type(message).__name__}", flush=True)
                # Log message content if available
                if hasattr(message, 'content'):
                    content_preview = str(message.content)[:200] if message.content else "None"
                    print(f"[Channel Discovery Agent] Message content preview: {content_preview}...", flush=True)
                # Also check for tool calls
                if hasattr(message, 'tool_calls'):
                    print(f"[Channel Discovery Agent] Message has {len(message.tool_calls) if message.tool_calls else 0} tool calls", flush=True)
        except Exception as query_error:
            print(f"[Channel Discovery Agent] Error during query iteration: {str(query_error)}", flush=True)
            print(f"[Channel Discovery Agent] Error type: {type(query_error).__name__}", flush=True)
            import traceback
            print(f"[Channel Discovery Agent] Traceback: {traceback.format_exc()}", flush=True)
            raise

        print(f"[Channel Discovery Agent] Agent completed after {message_count} messages", flush=True)

        # Read the output file the agent created
        # Check both the expected path and /tmp variant (Write tool sometimes uses /tmp)
        possible_paths = [
            output_file,  # Expected path
            Path('/tmp') / output_file.relative_to(output_dir),  # /tmp variant
        ]
        
        print(f"[Channel Discovery Agent] Checking for output file at: {output_file}", flush=True)
        print(f"[Channel Discovery Agent] File exists: {output_file.exists()}", flush=True)
        
        found_file = None
        for path in possible_paths:
            if path.exists():
                found_file = path
                print(f"[Channel Discovery Agent] Found output file at: {path}", flush=True)
                break
        
        if found_file:
            with open(found_file, 'r') as f:
                channels_data = json.load(f)

            return {
                "status": "success",
                "channels": channels_data.get("channels", []),
                "output_file": str(found_file)
            }
        else:
            # List what files do exist in the directory for debugging
            if output_dir.exists():
                existing_files = list(output_dir.glob('*.json'))
                print(f"[Channel Discovery Agent] Existing JSON files in {output_dir}: {[str(f) for f in existing_files]}", flush=True)
            return {
                "status": "error",
                "error": f"Agent did not create output file. Expected: {output_file}"
            }

    except Exception as e:
        print(f"[Channel Discovery Agent] Error: {str(e)}", flush=True)
        return {
            "status": "error",
            "error": str(e)
        }


def main():
    parser = argparse.ArgumentParser(description="Discover recruiting channels with real examples")
    parser.add_argument("--query", required=True, help="Refined recruiting query")
    parser.add_argument("--company-context", default="", help="Optional company context")
    parser.add_argument("--output-dir", default="data/recruiting-channels", help="Output directory")
    parser.add_argument("--constraints", nargs="*", default=[], help="Additional constraints (examples must meet these)")

    args = parser.parse_args()

    output_dir = Path(args.output_dir)

    # Run the async agent
    result = asyncio.run(discover_channels(
        refined_query=args.query,
        company_context=args.company_context,
        output_dir=output_dir,
        additional_constraints=args.constraints
    ))

    # Output result as JSON (last line for parsing)
    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
