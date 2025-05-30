"use client";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { ceos } from "@/data/ceos";
import Link from "next/link";

// Define coaches in the same order as Meet The Coaches page
const orderedCoaches = [
	{ id: "donte", name: "Donte Disrupt" },
	{ id: "alex", name: "Alex Monroe" },
	{ id: "rohan", name: "Rohan Mehta" },
	{ id: "eljas", name: "Eljas Virtanen" },
	{ id: "venus", name: "Venus Metrics" },
	{ id: "kailey", name: "Kailey Sloan" },
];

export default function ChatSidebar() {
	return (
		<Sidebar>
			<SidebarContent className="flex flex-col py-12 md:py-16">
				<div className="mb-2 px-6 text-sm text-white/50">Choose coach:</div>
				{orderedCoaches.map((coach) => (
					<Link
						key={coach.id}
						href={`/dashboard?ceo=${coach.id}`}
						className="py-1.5 px-8 text-left text-sm hover:bg-white/5 transition-colors text-white/80 hover:text-white"
					>
						{coach.name}
					</Link>
				))}
			</SidebarContent>
		</Sidebar>
	);
}
