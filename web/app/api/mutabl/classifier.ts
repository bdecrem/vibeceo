import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CLASSIFIER_PROMPT = `You classify user requests for a React component builder. Output ONLY "fast" or "deep".

FAST — single-pass code generation can handle it:
- Styling changes (colors, fonts, spacing, borders, shadows)
- Layout changes (reorder, add sections, resize)
- Copy/text changes
- Simple feature additions (add a button, toggle, counter)
- Theming (dark mode, accent color)
- Show/hide elements

DEEP — needs tool use to read source files and reason through the change:
- Bug reports ("not working", "broken", "doesn't do anything")
- Multi-step changes ("add X, then wire it to Y, and also Z")
- References to component internals ("the RichEditor", "the sidebar component", "the hook")
- Vague/exploratory ("make it better", "improve the UX")
- Requests that need understanding of how existing code works
- Performance or behavior issues

Output exactly one word: fast or deep`;

export async function classifyRequest(
  message: string,
  codeLength: number
): Promise<"fast" | "deep"> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      system: CLASSIFIER_PROMPT,
      messages: [
        {
          role: "user",
          content: `Code length: ${codeLength} chars\nRequest: ${message}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text"
        ? response.content[0].text.trim().toLowerCase()
        : "";

    if (text === "deep") return "deep";
    return "fast";
  } catch {
    return "fast";
  }
}
