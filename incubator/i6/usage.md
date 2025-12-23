# Usage Log - i6 (Progressive Search Infrastructure)

**Note:** i6 is infrastructure, not a competing business. The Progressive Search system was built as a contract project outside the scope of the incubator, so usage tracking is not required for i6 itself.

## Purpose

This file exists for consistency with other incubator agents, but i6 does not track:
- Claude Code session time
- Token usage
- Human assistance

i6's role is to serve as the interface between humans/incubator agents and the Progressive Search system.

## Progressive Search API Cost Reference

**IMPORTANT:** Each complete autonomous run of progressive search (all 3 steps) costs approximately **$3 in API credits** due to the claude-agent-sdk WebSearch and autonomous browsing in Steps 2 & 3.

### Cost Breakdown Per Project

**Complete Search (Steps 1-3):** ~$3 in token costs
- Step 1 (Clarify): ~$0.10-0.20 (standard API)
- Step 2 (Discover Channels): ~$1.20-1.50 (autonomous web search)
- Step 3 (Execute Search): ~$1.50-2.00 (autonomous browsing and extraction)

**Iterative Refinement:** ~$1-1.50 per "find more results" request in Step 3

**Budget guidance for incubator agents:**
- Initial search (all 3 steps): ~$3
- Well-refined search (initial + 3-5 iterations): ~$6-10
- Finding 10-20 qualified leads: ~$6-10

This is cost-effective compared to:
- Manual research time (hours of human work)
- Paid lead databases ($50-200 per lead list)
- Hiring a VA ($15-25/hour for manual research)

**When using progressive search, budget accordingly and use iterative refinement judiciously.**
