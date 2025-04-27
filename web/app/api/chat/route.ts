import { NextResponse } from "next/server";
import { createChatCompletion, type Message } from "@/lib/openai";
import { ceos } from "@/../data/ceos";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	try {
		const {
			messages,
			stream = false,
			ceoId = "donte",
		} = (await request.json()) as {
			messages: Message[];
			stream?: boolean;
			ceoId?: string;
		};

		if (!Array.isArray(messages) || messages.length === 0) {
			return NextResponse.json(
				{ error: "Messages array is required" },
				{ status: 400 }
			);
		}

		// Find the selected CEO
		const selectedCEO = ceos.find((ceo) => ceo.id === ceoId) || ceos[0];
		console.log(
			"Selected CEO:",
			selectedCEO.id,
			"with prompt:",
			selectedCEO.prompt.substring(0, 100) + "..."
		);

		// Create a new messages array with the CEO's system prompt
		const messagesWithPrompt: Message[] = [
			{
				role: "system" as const,
				content: selectedCEO.prompt,
			},
		];

		// Add all previous messages except any existing system messages
		messages.forEach((msg) => {
			if (msg.role !== "system") {
				messagesWithPrompt.push(msg);
			}
		});

		console.log(
			"Sending messages to OpenAI:",
			messagesWithPrompt.map((m) => ({
				role: m.role,
				content: m.content.substring(0, 50) + "...",
			}))
		);

		const completion = await createChatCompletion(messagesWithPrompt, {
			stream,
		});

		if (stream) {
			// For streaming responses, return the ReadableStream
			const stream = completion as ReadableStream<Uint8Array>;
			return new Response(stream, {
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					Connection: "keep-alive",
				},
			});
		}

		// For non-streaming responses, return the completion as JSON
		return NextResponse.json(completion);
	} catch (error: any) {
		console.error("Chat completion error details:", {
			name: error?.name,
			message: error?.message,
			stack: error?.stack,
			cause: error?.cause,
		});
		return NextResponse.json(
			{
				error: "Failed to generate chat completion",
				details: error?.message || "Unknown error",
			},
			{ status: 500 }
		);
	}
}
