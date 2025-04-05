"use client";
import {
	Sidebar,
	SidebarContent,
} from "@/components/ui/sidebar";

export default function ChatSidebar() {
	return (
		<Sidebar>
			<SidebarContent className="flex flex-col py-12 md:py-16">
				<button className="py-1.5 px-6 text-left text-sm hover:bg-white/5 transition-colors">
					Donte
				</button>
				<button className="py-1.5 px-6 text-left text-sm hover:bg-white/5 transition-colors">
					Sophia
				</button>
				<button className="py-1.5 px-6 text-left text-sm hover:bg-white/5 transition-colors">
					Marcus
				</button>
				<button className="py-1.5 px-6 text-left text-sm hover:bg-white/5 transition-colors">
					Elena
				</button>
				<button className="py-1.5 px-6 text-left text-sm hover:bg-white/5 transition-colors">
					James
				</button>
				<button className="py-1.5 px-6 text-left text-sm hover:bg-white/5 transition-colors">
					Maya
				</button>
			</SidebarContent>
		</Sidebar>
	);
}
