import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  title: "Inspiration - TryAir",
  description: "AI video ad generator",
};

export default function InspirationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
