"use client";
import {
	Sidebar,
	SidebarContent,
} from "@/components/ui/sidebar";

export default function ChatSidebar() {
	return (
		<Sidebar>
			<SidebarContent className="flex flex-col gap-6 md:gap-8 px-6 py-8 md:py-12">
				<button className="text-left text-lg md:text-xl font-medium hover:text-[#40e0d0] transition-colors">
					Donte
				</button>
				<button className="text-left text-lg md:text-xl font-medium hover:text-[#40e0d0] transition-colors">
					Sophia
				</button>
				<button className="text-left text-lg md:text-xl font-medium hover:text-[#40e0d0] transition-colors">
					Marcus
				</button>
				<button className="text-left text-lg md:text-xl font-medium hover:text-[#40e0d0] transition-colors">
					Elena
				</button>
				<button className="text-left text-lg md:text-xl font-medium hover:text-[#40e0d0] transition-colors">
					James
				</button>
				<button className="text-left text-lg md:text-xl font-medium hover:text-[#40e0d0] transition-colors">
					Maya
				</button>
			</SidebarContent>
		</Sidebar>
	);
}
