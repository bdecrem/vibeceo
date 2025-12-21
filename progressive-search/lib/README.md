# Progressive Search Library Modules

Core utilities for the progressive search agent system.

## Modules

### `db.py` - Database Operations

Clean CRUD interface for all `ps_*` tables via Supabase.

**Projects:**
- `create_project(initial_subject, category)` - Create new project
- `get_project(project_id)` - Fetch project
- `save_clarified_subject(project_id, clarified_subject)` - Save refined subject
- `mark_project_complete(project_id, winner_result_id)` - Complete project

**Conversation:**
- `add_message(project_id, step, role, content)` - Add message to history
- `get_conversation(project_id, step)` - Get all messages for a step

**Channels:**
- `save_channels(project_id, channels)` - Save multiple channels
- `get_channels(project_id, approved_only=False)` - Get channels
- `update_channel_rating(channel_id, rating)` - Update rating
- `approve_channels(project_id)` - Mark all channels approved

**Results:**
- `save_results(project_id, results)` - Save search results
- `get_results(project_id, favorites_only=False)` - Get results
- `update_result_rating(result_id, rating, notes)` - Update result feedback
- `add_to_favorites(result_id)` - Mark as favorite
- `mark_as_winner(project_id, result_id)` - Mark winner & complete

### `command_parser.py` - Agent Command Extraction

Parses structured commands from agent responses and executes them.

**Main Functions:**
- `parse_and_execute(project_id, agent_response, step)` - Parse & execute all commands
- `extract_json_commands(text)` - Extract JSON command blocks
- `clean_response(text)` - Remove commands from response text

**Supported Commands:**

Step 1:
- `SAVE_SUBJECT` - Save clarified subject
- `UPDATE_SUBJECT` - Update existing subject

Step 2:
- `SAVE_CHANNELS` - Save channel list
- `UPDATE_CHANNELS` - Update channel ratings
- `APPROVE_CHANNELS` - Mark channels approved

Step 3:
- `SAVE_RESULTS` - Save search results
- `UPDATE_RESULTS` - Update result ratings/notes
- `ADD_TO_FAVORITES` - Mark results as favorites
- `MARK_WINNER` - Mark winner result

### `context_builder.py` - Agent Context Construction

Builds conversation context from database state for each step.

**Functions:**
- `build_step1_context(project_id, user_message)` - Build Step 1 context
- `build_step2_context(project_id, user_message)` - Build Step 2 context
- `build_step3_context(project_id, user_message)` - Build Step 3 context (includes previous results for deduplication)
- `get_project_state_summary(project_id)` - Human-readable project status

### `system_prompts.py` - Prompt Loading

Loads two-layer prompt architecture (base + category).

**Functions:**
- `load_step_prompt(step, category)` - Load complete prompt for a step
- `load_prompt_file(filename)` - Load individual prompt file
- `get_available_categories()` - List available categories

**Prompt Structure:**
```
final_prompt = base_step1.txt + step1/leadgen.txt
```

## Environment Variables Required

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
ANTHROPIC_API_KEY=your-anthropic-key
# Optional: CLAUDE_CODE_OAUTH_TOKEN for autonomous web search
```

## Example Usage

```python
from lib import db, context_builder, command_parser, system_prompts

# Create a new project
project = db.create_project(
    initial_subject="Find senior backend engineers",
    category="recruiting"
)

project_id = project['id']

# Build context for Step 1
messages = context_builder.build_step1_context(project_id, "I want remote-friendly")

# Load system prompt
system_prompt = system_prompts.load_step_prompt(step=1, category="recruiting")

# Call agent (step scripts handle this)
# agent_response = call_anthropic_api(system_prompt, messages)

# Parse and execute commands from agent response
cleaned_response, executed_commands = command_parser.parse_and_execute(
    project_id,
    agent_response,
    step=1
)

# Save agent response to conversation
db.add_message(project_id, step=1, role='assistant', content=cleaned_response)
```

## Testing

Run individual module tests:
```bash
# Test prompt loader
python -m lib.system_prompts

# Test database connection (create a test script)
python tests/test_db.py
```
