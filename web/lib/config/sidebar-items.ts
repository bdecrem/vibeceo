import { Info, Users, Settings } from 'lucide-react'

export interface SidebarItem {
  id: string
  label: string
  path: string
  icon?: any // Lucide icon component
  group: 'recent' | 'setup'
}

export const sidebarItems: SidebarItem[] = [
  {
    id: 'recent-1',
    label: 'How to handle difficult customers',
    path: '/chat/difficult-customers',
    group: 'recent'
  },
  {
    id: 'recent-2',
    label: 'Sales Strategy',
    path: '/chat/sales-strategy',
    group: 'recent'
  },
  {
    id: 'recent-3',
    label: 'Team Management',
    path: '/chat/team-management',
    group: 'recent'
  },
  {
    id: 'donte',
    label: 'Your CEO: Donte',
    path: '/ceo',
    icon: Info,
    group: 'setup'
  },
  {
    id: 'company',
    label: 'Company Profile',
    path: '/company',
    icon: Users,
    group: 'setup'
  },
  {
    id: 'values',
    label: 'Core Values',
    path: '/values',
    icon: Settings,
    group: 'setup'
  }
] 