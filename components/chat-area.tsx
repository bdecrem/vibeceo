"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Smile, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "@/lib/hooks/use-chat";
import { ChatMessage } from "@/components/chat-message";
import { StickyBottom } from "@/components/layouts/sticky-bottom";

export default function ChatArea() {
	const { messages, isLoading, error, sendMessage } = useChat();
	const [newMessage, setNewMessage] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
	const lastMessageRef = useRef<string>("");

	// Auto focus input and show keyboard on mobile
	useEffect(() => {
		// Check if we're on mobile
		const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
		if (isMobile && inputRef.current) {
			// Small delay to ensure the keyboard appears after page transition
			setTimeout(() => {
				inputRef.current?.focus();
				// Create a touch event to simulate user interaction
				const touchEvent = new TouchEvent("touchstart", {
					bubbles: true,
					cancelable: true,
					view: window,
				});
				inputRef.current?.dispatchEvent(touchEvent);
				inputRef.current?.click();
			}, 500);
		}
	}, []);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	// Auto scroll when new messages arrive or during streaming
	useEffect(() => {
		const lastMessage = messages[messages.length - 1];
		if (!lastMessage) return;

		// If it's a new message or the content has changed and we should auto-scroll
		if (
			shouldAutoScroll &&
			(lastMessage.content !== lastMessageRef.current ||
				lastMessage.role === "user")
		) {
			scrollToBottom();
			lastMessageRef.current = lastMessage.content;
		}
	}, [messages, shouldAutoScroll]);

	// Handle scroll events to determine if we should auto-scroll
	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
		const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
		setShouldAutoScroll(isAtBottom);
	};

	const handleSendMessage = async (e: React.FormEvent) => {
		e.preventDefault();
		if (newMessage.trim() && !isLoading) {
			await sendMessage(newMessage.trim());
			setNewMessage("");
			setShouldAutoScroll(true); // Enable auto-scroll when sending a new message
		}
	};

	return (
		<div className="h-full bg-[hsl(var(--background-outer))]">
			<div className="flex h-full flex-col max-w-2xl mx-auto w-full px-2 md:px-8 bg-[hsl(var(--background))]">
				<div
					className="grow overflow-y-auto p-4 scrollbar-light space-y-4 h-0 pb-32 md:pb-24 pt-2 md:pt-2"
					onScroll={handleScroll}
				>
					{messages.map((message, index) => (
						<ChatMessage
							key={index}
							message={message}
							time={new Date().toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})}
						/>
					))}
					<div ref={messagesEndRef} />
					{error && (
						<div className="flex justify-center">
							<div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg">
								{error}
							</div>
						</div>
					)}
				</div>

				<StickyBottom alwaysVisible withSafeArea className="border-t">
					<div className="max-w-2xl mx-auto w-full">
						<form
							onSubmit={handleSendMessage}
							className="flex items-center gap-2 p-2 md:p-4"
						>
							<Button
								variant="outline"
								size="icon"
								type="button"
								className="shrink-0 hidden md:inline-flex"
							>
								<Paperclip className="h-4 w-4" />
							</Button>
							<Input
								ref={inputRef}
								placeholder="Message your coach"
								value={newMessage}
								onChange={(e) => setNewMessage(e.target.value)}
								className="flex-1 text-base"
								disabled={isLoading}
								autoComplete="off"
							/>
							<Button
								variant="outline"
								size="icon"
								type="button"
								className="shrink-0 hidden md:inline-flex"
							>
								<Smile className="h-4 w-4" />
							</Button>
							<Button
								type="submit"
								size="icon"
								className="shrink-0 h-10 w-10 md:h-9 md:w-9 bg-[#40e0d0] hover:bg-[#3bcdc0] text-[#1a3d3d] font-medium"
								disabled={isLoading}
							>
								{isLoading ? (
									<Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin" />
								) : (
									<Send className="h-5 w-5 md:h-4 md:w-4" />
								)}
							</Button>
						</form>
					</div>
				</StickyBottom>
			</div>
		</div>
	);
}
