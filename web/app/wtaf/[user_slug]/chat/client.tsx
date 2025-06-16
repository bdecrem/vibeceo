"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import WtafChatLayout from "@/components/wtaf-chat-layout";

export default function WtafChatClient() {
	return (
		<SidebarProvider>
			<WtafChatLayout />
		</SidebarProvider>
	);
} 