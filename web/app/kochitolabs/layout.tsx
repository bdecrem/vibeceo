import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  title: "Kochito Labs",
  description: "AI agents and experiments",
  openGraph: {
    title: "Kochito Labs",
    description: "AI agents and experiments",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kochito Labs",
    description: "AI agents and experiments",
  },
};

export default function KochitoLabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
