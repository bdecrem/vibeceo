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
  title: "Decremental",
  description: "AI agents and experiments",
  openGraph: {
    title: "Decremental",
    description: "AI agents and experiments",
    type: "website",
    images: [
      {
        url: "/kochitolabs/og-kochitolabs.png",
        width: 1200,
        height: 630,
        alt: "Decremental",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Decremental",
    description: "AI agents and experiments",
    images: ["/kochitolabs/og-kochitolabs.png"],
  },
};

export default function KochitoLabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
