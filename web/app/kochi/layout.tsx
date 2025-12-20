import type { Metadata } from "next";

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
