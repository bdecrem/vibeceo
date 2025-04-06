"use client";
import {
	Sidebar,
	SidebarContent,
} from "@/components/ui/sidebar";
import { ceos } from '@/data/ceos';
import Link from 'next/link';

export default function ChatSidebar() {
	return (
		<Sidebar>
			<SidebarContent className="flex flex-col py-12 md:py-16">
				{ceos.map((coach) => (
					<Link
						key={coach.id}
						href={`/dashboard?ceo=${coach.id}`}
						className="py-1.5 px-6 text-left text-sm hover:bg-white/5 transition-colors"
					>
						{coach.name}
					</Link>
				))}
			</SidebarContent>
		</Sidebar>
	);
}
