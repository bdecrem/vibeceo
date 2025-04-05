"use client";
import { Users, MessageSquare, Settings, User, LogOut } from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarFooter,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarGroupContent,
} from "@/components/ui/sidebar";

export default function ChatSidebar() {
	return (
		<Sidebar>
			<SidebarHeader className="shrink-0 p-4">
				<div className="flex items-center gap-2" />
			</SidebarHeader>

			<SidebarContent className="flex-1 overflow-y-auto">
				<SidebarGroup>
					<SidebarGroupLabel className="px-6">Recent</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu className="space-y-0.5">
							<SidebarMenuItem>
								<SidebarMenuButton className="py-1.5 px-6">
									{[null, "How to handle difficult customers?"]}
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton className="py-1.5 px-6">
									{[null, "Best practices for team meetings"]}
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton className="py-1.5 px-6">
									{[null, "Strategic planning tips"]}
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup className="mt-12">
					<SidebarGroupLabel className="px-6">Setup</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu className="space-y-2">
							<SidebarMenuItem>
								<SidebarMenuButton className="py-1.5 px-6">
									{[null, "CEO Personality"]}
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton className="py-1.5 px-6">
									{[null, "Company Profile"]}
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton className="py-1.5 px-6">
									{[null, "Core Values"]}
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="shrink-0 p-4 border-t">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton>
							<User className="h-4 w-4" />
							<span>Profile</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem className="mt-4">
						<SidebarMenuButton>
							<LogOut className="h-4 w-4" />
							<span>Logout</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
