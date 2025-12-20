import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kochi.to - AI delivered daily",
  description: "Your personal AI agent assistant over SMS",
  openGraph: {
    title: "Kochi.to - AI delivered daily",
    description: "Your personal AI agent assistant over SMS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kochi.to - AI delivered daily",
    description: "Your personal AI agent assistant over SMS",
  },
};

export default function KochiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
