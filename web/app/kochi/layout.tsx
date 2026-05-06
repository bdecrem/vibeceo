import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#F2EBDF',
};

export const metadata: Metadata = {
  title: "Kochi — Proactive Agent",
  description: "The AI agent that never rests. An OpenClaw chat client for iOS.",
  openGraph: {
    title: "Kochi — Proactive Agent",
    description: "The AI agent that never rests.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kochi — Proactive Agent",
    description: "The AI agent that never rests.",
  },
};

export default function KochiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
