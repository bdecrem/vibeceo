"use client";

import { cn } from "@/lib/utils";
import ChatSidebar from "@/components/chat-sidebar";
import ChatArea from "@/components/chat-area";
import { SidebarTrigger } from "@/components/sidebar-trigger";
import { useSidebar } from "@/components/ui/sidebar";
import { useCEO } from "@/lib/contexts/ceo-context";
import Link from "next/link";

export default function ChatLayout() {
	const { isOpen, toggle } = useSidebar();
	const { selectedCEO } = useCEO();

	return (
		<div className="flex flex-col h-[100dvh] md:h-screen overflow-hidden bg-gradient-to-tr from-[#1a3d3d]/[0.05] to-[#40e0d0]/[0.08]">
			{/* Navbar */}
			<div className="shrink-0 top-0 left-0 right-0 z-50 bg-[#1a3d3d] flex items-center px-4 py-3 shadow-md">
				<div className="flex items-center w-full">
					<div className="[&_button]:text-white [&_button]:hover:text-white/90 [&_button]:hover:bg-white/10">
						<SidebarTrigger />
					</div>
					<div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
						<Link
							href="/"
							className="text-sm font-medium text-white hover:text-white/90 transition-colors"
						>
							<span className="text-[#40e0d0] md:inline hidden">Advisors</span>
							<span className="text-[#40e0d0] md:hidden">AF</span>
							<span className="md:inline hidden">Foundry</span>
						</Link>
						{selectedCEO && (
							<>
								<span className="text-white/40">•</span>
								<span className="text-[#40e0d0] text-sm">
									{selectedCEO.name}
								</span>
							</>
						)}
					</div>
				</div>
			</div>
			{/* Chat Area */}
			<div className="flex grow relative">
				<div
					className={cn(
						"transition-all duration-300 w-[240px] md:w-60 border-r-0 border-[#40e0d0]/10 bg-[#1a3d3d]/[0.98] backdrop-blur-sm text-white [&_button]:text-white/90 [&_button:hover]:bg-white/5 [&_button:hover]:text-white [&_span]:text-white/90",
						isOpen
							? "md:relative fixed max-md:h-[92dvh] left-0 z-20"
							: "absolute -left-[240px] md:-left-60"
					)}
				>
					<ChatSidebar />
				</div>
				{/* Mobile overlay for tap-to-dismiss */}
				{isOpen && (
					<div 
						className="md:hidden fixed inset-0 z-10 ml-[240px]"
						onClick={toggle}
					/>
				)}
				<div className="min-h-0 bg-white/40 max-md:shrink-0 w-full backdrop-blur-sm">
					<ChatArea />
				</div>
			</div>
		</div>
	);
}
