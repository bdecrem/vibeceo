"use client";

import WtafChatArea from "@/components/wtaf-chat-area";
import Link from "next/link";

export default function WtafChatLayout() {
	return (
		<div className="flex flex-col h-[100dvh] md:h-screen overflow-hidden bg-gradient-to-tr from-[#ff6b6b]/[0.05] to-[#4ecdc4]/[0.08]">
			{/* Navbar */}
			<div className="shrink-0 top-0 left-0 right-0 z-50 bg-[#1a3d3d] flex items-center px-4 py-3 shadow-md">
				<div className="flex items-center w-full">
					<div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
						<Link
							href="/wtaf"
							className="text-sm font-medium text-white hover:text-white/90 transition-colors"
						>
							<span className="text-[#ff6b6b] md:inline hidden">WTAF</span>
							<span className="text-[#ff6b6b] md:hidden">W</span>
							<span className="md:inline hidden">Code Generator</span>
						</Link>
						<span className="text-white/40">•</span>
						<span className="text-[#4ecdc4] text-sm">
							Delusional App Generator
						</span>
					</div>
				</div>
			</div>
			{/* Chat Area - Full Width */}
			<div className="flex grow relative">
				<div className="min-h-0 bg-white/40 max-md:shrink-0 w-full backdrop-blur-sm">
					<WtafChatArea />
				</div>
			</div>
		</div>
	);
} 