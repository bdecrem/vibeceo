import { NextResponse } from "next/server";
import OpenAI from "openai";
import { KOCHI_SYSTEM_PROMPT } from "@/lib/kochiPrompt";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. Kochi chat responses will fail until configured.");
}

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const messages: Message[] = Array.isArray(body?.messages) ? body.messages : [];

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Conversation history is required." },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 220,
      temperature: 0.9,
      messages: [
        { role: "system", content: KOCHI_SYSTEM_PROMPT },
        ...messages
      ]
    });

    const responseMessage =
      completion.choices[0]?.message?.content?.trim() ??
      "i'm stuck for a second — mind trying again?";

    return NextResponse.json({ message: responseMessage });
  } catch (error) {
    console.error("[Kochi API] Error generating response:", error);
    return NextResponse.json(
      { error: "Something went wrong generating Kochi's response." },
      { status: 500 }
    );
  }
}
