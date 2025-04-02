import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface SocialLink {
  text: string;
  href: string;
}

interface XLink extends SocialLink {
  icon: ReactNode;
}

interface Stat {
  icon: LucideIcon;
  text: string;
}

export interface Coach {
  id: string;
  name: string;
  title: string;
  image: string;
  quote: string;
  bio: string[];
  socialLink: SocialLink;
  xLink?: XLink;
  stats: Stat[];
} 