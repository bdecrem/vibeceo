import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kochi.to - Disco Test",
  description: "Test version with disco animation integration",
  openGraph: {
    title: "Kochi.to - Disco Test",
    description: "Test version with disco animation integration",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kochi.to - Disco Test",
    description: "Test version with disco animation integration",
  },
};

export default function KochiDiscoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
