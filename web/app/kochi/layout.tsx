import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#1a2a1a',
};

export const metadata: Metadata = {
  title: "Kochi.to",
  description: "AI delivered daily",
  openGraph: {
    title: "Kochi.to",
    description: "AI delivered daily",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kochi.to",
    description: "AI delivered daily",
  },
};

export default function KochiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
