import { NextResponse } from "next/server";
import { type Message } from "@/lib/openai";
import { createClient } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

// Initialize Supabase client
const supabase = createClient(
	process.env.SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_KEY!
);

// Poll database for new WTAF results
async function pollForResults(startTime: Date, userSlug: string = 'cptcrk'): Promise<string | null> {
	for (let i = 0; i < 30; i++) { // Poll for up to 60 seconds
		try {
			const { data, error } = await supabase
				.from('wtaf_content')
				.select('app_slug, created_at')
				.eq('user_slug', userSlug)
				.gte('created_at', startTime.toISOString())
				.order('created_at', { ascending: false })
				.limit(1);

			if (error) {
				console.error('Database poll error:', error);
				await new Promise(resolve => setTimeout(resolve, 2000));
				continue;
			}

			if (data && data.length > 0) {
				const result = data[0];
				return `https://wtaf.me/${userSlug}/${result.app_slug}`;
			}
		} catch (error) {
			console.error('Poll error:', error);
		}
		
		// Wait 2 seconds before next poll
		await new Promise(resolve => setTimeout(resolve, 2000));
	}
	return null;
}

export async function POST(request: Request) {
	try {
		const {
			messages,
			stream = true,
		} = (await request.json()) as {
			messages: Message[];
			stream?: boolean;
		};

		if (!Array.isArray(messages) || messages.length === 0) {
			return NextResponse.json(
				{ error: "Messages array is required" },
				{ status: 400 }
			);
		}

		// Get the user's request (last user message)
		const userMessages = messages.filter(msg => msg.role === 'user');
		const lastUserMessage = userMessages[userMessages.length - 1];
		
		if (!lastUserMessage) {
			return NextResponse.json(
				{ error: "No user message found" },
				{ status: 400 }
			);
		}

		console.log("WTAF Chat - Processing request:", lastUserMessage.content);

		// Record start time for database polling
		const requestStartTime = new Date();

		// Send to existing SMS bot on port 3030 (reuse infrastructure!)
		const smsBodyData = new URLSearchParams({
			From: '+14156366573', // Real cptcrk user phone number
			Body: `WTAF ${lastUserMessage.content}` // Format like SMS command
		});

		try {
			// Send to SMS bot webhook 
			const smsResponse = await fetch('http://localhost:3030/sms/webhook', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: smsBodyData.toString()
			});

			console.log("SMS bot response status:", smsResponse.status);
		} catch (smsError) {
			console.error("Error calling SMS bot:", smsError);
		}

		if (stream) {
			// Create a streaming response
			const encoder = new TextEncoder();
			const stream = new ReadableStream({
				async start(controller) {
					try {
						// Send initial progress messages
						const progressMessages = [
							"🧪 WTAF received your chaotic request...\n\n",
							"📡 Signal transmitted to the chaos engine...\n\n",
							"⚡ Generating delusional code architecture...\n\n",
							"🎨 Applying questionable design patterns...\n\n",
							"🚀 Your chaotic app is materializing...\n\n"
						];

						// Send progress messages with delays
						for (const message of progressMessages) {
							controller.enqueue(encoder.encode(`data: ${message}`));
							await new Promise(resolve => setTimeout(resolve, 800));
						}

						// Poll for real results
						controller.enqueue(encoder.encode(`data: 🔍 Waiting for your page to be generated...\n\n`));
						
						const realUrl = await pollForResults(requestStartTime);
						
						if (realUrl) {
							// Success - show real URL
							controller.enqueue(encoder.encode(`data: ✅ WTAF delivered! Your page is ready:\n\n`));
							controller.enqueue(encoder.encode(`data: 🔗 **Your App:** ${realUrl}\n\n`));
							controller.enqueue(encoder.encode(`data: 📱 **Also sent to your phone via SMS!**\n\n`));
							controller.enqueue(encoder.encode(`data: Features include:\n• Questionable UI decisions ✨\n• Code that works by accident 🎲\n• Peak startup energy 🚀\n\n`));
							controller.enqueue(encoder.encode(`data: *Remember: If it breaks, it's a feature!*`));
						} else {
							// Timeout - show fallback
							controller.enqueue(encoder.encode(`data: ⏰ Page generation taking longer than expected...\n\n`));
							controller.enqueue(encoder.encode(`data: 🔗 **Check:** https://wtaf.me/cptcrk/ (may appear shortly)\n\n`));
							controller.enqueue(encoder.encode(`data: 📱 **You'll get SMS with direct link when ready!**`));
						}

						controller.enqueue(encoder.encode('data: [DONE]'));
						controller.close();
					} catch (error) {
						console.error("Streaming error:", error);
						controller.error(error);
					}
				}
			});

			return new Response(stream, {
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					Connection: "keep-alive",
				},
			});
		}

		// Non-streaming fallback
		return NextResponse.json({
			role: "assistant",
			content: "🧪 WTAF processing started! Check https://wtaf.me/cptcrk/ and watch for SMS notification."
		});

	} catch (error: any) {
		console.error("WTAF Chat error:", error);
		return NextResponse.json(
			{
				error: "Failed to generate WTAF response",
				details: error?.message || "Unknown error",
			},
			{ status: 500 }
		);
	}
} 