import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
const client = new Anthropic();
const html = fs.readFileSync("../web/public/amber/dialogue-feelings.html", "utf-8");
const msg = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 16000,
  messages: [{role: "user", content: `Translate to Dutch. Keep HTML/CSS. Keep "Soul Document", "Claude", "Amber", "Anthropic", "Constitution" in English. Output only HTML:\n\n${html}`}]
});
fs.writeFileSync("../web/public/amber/dialogue-gevoelens.html", msg.content[0].text);
console.log("Done");
