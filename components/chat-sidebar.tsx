"use client"
import { Users, MessageSquare, Settings, User, LogOut } from "lucide-react"
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
  SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const contacts = [
  { id: 1, name: "Sarah Johnson", status: "online", avatar: "/placeholder.svg?height=40&width=40" },
  { id: 2, name: "Michael Chen", status: "offline", avatar: "/placeholder.svg?height=40&width=40" },
  { id: 3, name: "Emma Wilson", status: "online", avatar: "/placeholder.svg?height=40&width=40" },
  { id: 4, name: "James Rodriguez", status: "away", avatar: "/placeholder.svg?height=40&width=40" },
  { id: 5, name: "Olivia Smith", status: "online", avatar: "/placeholder.svg?height=40&width=40" },
]

export default function ChatSidebar() {
  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <h2 className="text-lg font-semibold">Chat App</h2>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive>
                  <MessageSquare className="h-4 w-4" />
                  <span>Messages</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Users className="h-4 w-4" />
                  <span>Contacts</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Contacts</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contacts.map((contact) => (
                <SidebarMenuItem key={contact.id}>
                  <SidebarMenuButton>
                    <div className="relative">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={contact.avatar} alt={contact.name} />
                        <AvatarFallback>{contact.name[0]}</AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ${
                          contact.status === "online"
                            ? "bg-green-500"
                            : contact.status === "away"
                              ? "bg-yellow-500"
                              : "bg-gray-300"
                        }`}
                      />
                    </div>
                    <span>{contact.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <User className="h-4 w-4" />
              <span>Profile</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

