# AI Nodes Documentation

Complete guide to understanding and using AI-powered nodes in the Vibeceo workflow builder.

---

## Table of Contents
1. [AI Summarize](#ai-summarize)
2. [AI Extract](#ai-extract)
3. [AI Custom](#ai-custom)
4. [Requirements & Setup](#requirements--setup)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)

---

## AI Summarize

### What It Does
Creates concise summaries of content using OpenAI's language models. Perfect for distilling long articles, research papers, or news items into digestible summaries.

### How It Works

**Frontend (Workflow Builder):**
- Located in: `web/components/workflow/NodeConfigPanel.tsx` (lines 472-564)
- User configures: instruction, audience, max length, model, temperature
- Visual info box explains requirements and functionality

**Backend (Execution):**
- Located in: `sms-bot/src/agents/pipeline/summarize.ts`
- Process:
  1. Validates items exist and API key is configured
  2. Initializes OpenAI client (lazy initialization for performance)
  3. Can summarize items individually or as a batch
  4. Uses custom instructions and audience type to tailor output
  5. Returns formatted summary text

### Configuration Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `instruction` | string | "" | Custom instructions for the AI (optional) |
| `audience` | string | "" | Target audience (affects tone) |
| `maxLength` | number | 100 | Target summary length in words |
| `model` | string | "gpt-4o-mini" | AI model to use |
| `temperature` | number | 0.3 | Creativity level (0=focused, 1=creative) |

### Usage Example

**Input Items:**
- 10 research papers about AI safety

**Configuration:**
```json
{
  "instruction": "Focus on practical applications and key findings",
  "audience": "software engineers",
  "maxLength": 150,
  "model": "gpt-4o-mini",
  "temperature": 0.3
}
```

**Output:**
A cohesive 150-word summary highlighting the main themes and key findings from all 10 papers, written in technical language suitable for software engineers.

### Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| ❌ OPENAI_API_KEY not found | API key not configured | Add key to backend .env file |
| ❌ Cannot summarize: No items provided | No input items | Ensure source nodes provide items |
| ❌ OpenAI API authentication failed | Invalid API key | Check API key validity |
| ❌ OpenAI API rate limit exceeded | Too many requests | Upgrade plan or wait |

---

## AI Extract

### What It Does
Extracts structured data from unstructured content using AI. Specify which fields you want (e.g., company, location, price) and the AI identifies and extracts them from each item.

### How It Works

**Frontend (Workflow Builder):**
- Located in: `web/components/workflow/NodeConfigPanel.tsx` (lines 566-650)
- User configures: fields to extract, instructions, output format, model
- Shows validation warning if no fields specified
- Visual examples of extractable fields

**Backend (Execution):**
- Located in: `sms-bot/src/agents/pipeline/transform.ts`
- Process:
  1. Validates API key and items
  2. For each item, constructs a prompt asking AI to extract specified fields
  3. AI analyzes content and returns extracted data
  4. Results stored as structured JSON or text on each item

### Configuration Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `fields` | string[] | [] | **Required** - Fields to extract (comma-separated) |
| `instruction` | string | "" | Additional extraction guidance (optional) |
| `outputFormat` | string | "json" | Output format: "json" or "text" |
| `model` | string | "gpt-4o-mini" | AI model to use |

### Usage Example

**Input Items:**
- Job postings scraped from a website

**Configuration:**
```json
{
  "fields": ["company", "location", "salary", "tech_stack", "experience_level"],
  "instruction": "Focus on the most recent and explicit information",
  "outputFormat": "json",
  "model": "gpt-4o-mini"
}
```

**Output:**
Each job posting item now has extracted fields:
```json
{
  "title": "Senior Software Engineer",
  "company": "TechCorp Inc.",
  "location": "San Francisco, CA",
  "salary": "$150k-200k",
  "tech_stack": ["Python", "React", "AWS"],
  "experience_level": "5+ years"
}
```

### Field Examples

**Common Extractable Fields:**
- **Business**: company, location, industry, revenue, employees
- **Jobs**: salary, tech_stack, experience_level, remote_policy
- **Products**: price, features, rating, availability
- **Research**: methodology, findings, limitations, citations
- **News**: key_people, organizations, locations, dates

---

## AI Custom

### What It Does
Fully customizable AI transformation. Define your own system and user prompts to process content in any way you want. Most flexible option for unique use cases.

### How It Works

**Frontend (Workflow Builder):**
- Located in: `web/components/workflow/NodeConfigPanel.tsx` (lines 686-805)
- User configures: system prompt, user prompt template, output field, model, temperature, max tokens
- Shows available template variables with visual code blocks
- Validation warnings for required fields

**Backend (Execution):**
- Located in: `sms-bot/src/agents/pipeline/transform.ts`
- Process:
  1. Validates API key and configuration
  2. For each item, replaces template variables with actual item data
  3. Sends system prompt + user prompt to OpenAI
  4. Stores AI response in specified output field

### Configuration Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `systemPrompt` | string | "" | **Required** - Sets AI's role and behavior |
| `userPrompt` | string | "" | **Required** - Template for each item |
| `outputField` | string | "customOutput" | Field name to store AI response |
| `model` | string | "gpt-4o-mini" | AI model to use |
| `temperature` | number | 0.7 | Creativity (0-2 range) |
| `maxTokens` | number | 500 | Maximum response length |

### Template Variables

Use these variables in your `userPrompt`:
- `{{title}}` - Item title
- `{{summary}}` - Item summary
- `{{content}}` - Full item content
- `{{url}}` - Item URL
- `{{author}}` - Item author

### Usage Example

**Input Items:**
- Blog posts about AI technology

**Configuration:**
```json
{
  "systemPrompt": "You are an expert technology analyst who identifies business implications of AI advances. Be specific and actionable.",
  "userPrompt": "Analyze this article titled '{{title}}' and identify:\n1. Main technological advancement\n2. Business implications\n3. Recommended actions for companies\n\nArticle: {{content}}",
  "outputField": "businessAnalysis",
  "model": "gpt-4o",
  "temperature": 0.5,
  "maxTokens": 800
}
```

**Output:**
Each blog post item now has a `businessAnalysis` field with structured insights about technological advances, business implications, and recommended actions.

### Advanced Use Cases

1. **Sentiment + Reasoning**: Analyze sentiment and explain why
2. **Fact Checking**: Verify claims and provide sources
3. **Translation + Localization**: Translate with cultural context
4. **Content Moderation**: Flag inappropriate content with reasons
5. **SEO Optimization**: Generate meta descriptions and keywords
6. **Competitive Analysis**: Compare products and identify differentiators

---

## Requirements & Setup

### Backend Requirements

1. **OpenAI API Key** (Required for all AI nodes)
   - Get your key at: https://platform.openai.com/api-keys
   - Add to backend `.env` file:
     ```bash
     OPENAI_API_KEY=sk-...your-key-here
     ```
   - Location: `/sms-bot/.env.local`

2. **Supported Models**
   - `gpt-4o-mini` - Fast, cheap, good quality (recommended)
   - `gpt-4o` - Best quality, slower, more expensive
   - `gpt-3.5-turbo` - Legacy, cheapest, lower quality

### Cost Considerations

**Approximate Costs (as of 2024):**
- GPT-4o Mini: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- GPT-4o: ~$2.50 per 1M input tokens, ~$10 per 1M output tokens

**Example Calculation:**
- Processing 100 articles (~500 words each) with GPT-4o Mini
- Input: ~75k tokens × $0.15/1M = $0.01
- Output: ~10k tokens × $0.60/1M = $0.006
- **Total: ~$0.02 per run**

### Environment Variables

Add to `/sms-bot/.env.local`:
```bash
# Required for AI nodes
OPENAI_API_KEY=sk-proj-...

# Optional: Override default model
DEFAULT_LLM_MODEL=gpt-4o-mini
```

---

## Error Handling

### Frontend Validation

**Missing Required Fields:**
- AI Extract: Shows amber warning if no fields specified
- AI Custom: Shows warnings for missing system/user prompts

**Real-time Feedback:**
- Color-coded info boxes explain requirements
- Inline validation messages guide configuration
- Visual examples of expected inputs

### Backend Error Handling

**API Key Errors:**
```
❌ OPENAI_API_KEY not found in environment.
Please configure your OpenAI API key in the backend .env file.
Get your key at: https://platform.openai.com/api-keys
```

**Authentication Errors:**
```
❌ OpenAI API authentication failed. Please check your API key.
```

**Rate Limit Errors:**
```
❌ OpenAI API rate limit exceeded. Please try again later or upgrade your plan.
```

**Server Errors:**
```
❌ OpenAI API server error. Please try again later.
```

**Input Validation:**
```
❌ Cannot summarize: No items provided
```

### Graceful Degradation

AI nodes are designed to fail gracefully:
- Transform nodes: Return original items if transformation fails
- Extract nodes: Skip extraction and preserve original data
- Summarize nodes: Throw error (required for workflow to complete)

---

## Best Practices

### 1. Start with AI Summarize

**When to use:**
- You want concise overviews
- Processing large volumes of content
- Need consistent formatting

**Tips:**
- Use lower temperature (0.1-0.3) for factual summaries
- Specify audience for better tone matching
- Start with gpt-4o-mini for cost efficiency

### 2. Use AI Extract for Structured Data

**When to use:**
- Converting unstructured text to structured data
- Need specific fields extracted consistently
- Building databases or spreadsheets

**Tips:**
- Be specific with field names (not "info", use "company_revenue")
- Use JSON output format for downstream processing
- Provide extraction instructions for ambiguous fields

### 3. Leverage AI Custom for Unique Needs

**When to use:**
- None of the preset nodes fit your use case
- Need multi-step reasoning
- Combining multiple transformations

**Tips:**
- Write detailed system prompts (AI's expertise matters)
- Use examples in prompts for better results
- Iterate on prompts with preview/test mode
- Start with higher token limits, then optimize

### 4. Chain AI Nodes

**Example Pipeline:**
1. **Source**: Fetch tech news articles
2. **AI Extract**: Extract company, technology, impact
3. **AI Summarize**: Create executive summary
4. **AI Custom**: Generate investment insights
5. **Output**: Send as SMS or email

### 5. Optimize for Cost

**Strategies:**
- Use gpt-4o-mini by default (10x cheaper than gpt-4o)
- Reduce max tokens to minimum needed
- Filter items before AI processing (use keyword/date filters first)
- Process in batches when possible (summarize all at once vs per-item)
- Monitor usage through OpenAI dashboard

### 6. Test Before Deploying

**Testing Workflow:**
1. Start with 1-2 test items
2. Review AI output quality
3. Adjust prompts/settings
4. Test with larger batch (10-20 items)
5. Monitor costs and performance
6. Deploy with confidence

### 7. Handle Errors Gracefully

**Defensive Configuration:**
- Always configure fallback outputs
- Use filters before expensive AI operations
- Set reasonable max tokens limits
- Monitor API key usage and limits
- Have alerts for failed runs

---

## Troubleshooting

### "Configure" Warning Won't Go Away

**Problem:** Node shows "⚠ Configure" even after setting everything up

**Solutions:**
1. Check all required fields are filled (marked with *)
2. For AI Extract: Ensure at least one field is specified
3. For AI Custom: Both system and user prompts are required
4. Click outside the panel and back to refresh state

### No Output from AI Nodes

**Problem:** Workflow runs but AI transformations don't appear

**Solutions:**
1. Check backend logs for error messages
2. Verify OPENAI_API_KEY is set in backend .env
3. Ensure items are reaching the AI node (check earlier filters)
4. Test with a simple prompt first
5. Check OpenAI dashboard for API errors

### Inconsistent Results

**Problem:** AI returns different results for same input

**Solutions:**
1. Lower temperature (0.1-0.3) for consistency
2. Use more specific prompts
3. Provide examples in system prompt
4. Switch to gpt-4o for better quality
5. Add format instructions ("Respond in JSON format")

### High Costs

**Problem:** OpenAI bills are higher than expected

**Solutions:**
1. Switch to gpt-4o-mini (10x cheaper)
2. Reduce max tokens
3. Filter items before AI processing
4. Batch process (summarize all vs per-item)
5. Set up OpenAI usage alerts

---

## Support & Resources

**OpenAI Documentation:**
- API Reference: https://platform.openai.com/docs/api-reference
- Prompt Engineering: https://platform.openai.com/docs/guides/prompt-engineering
- Models: https://platform.openai.com/docs/models

**Vibeceo Resources:**
- Node Palette: `/web/lib/node-palette.ts`
- Node Config Panel: `/web/components/workflow/NodeConfigPanel.tsx`
- Backend Pipeline: `/sms-bot/src/agents/pipeline/`

**Getting Help:**
- Check console logs (browser and backend)
- Review error messages (they include solutions)
- Test with minimal configuration first
- Refer to usage examples in this document

---

*Last Updated: 2025-11-26*
