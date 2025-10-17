import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kochi.to - Your personal AI companion over SMS",
  description: "Your AI companion delivering daily blasts on tech, science, and finance. Weather permitting.",
  openGraph: {
    title: "Kochi.to",
    description: "Your AI companion delivering daily blasts on tech, science, and finance. Weather permitting.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kochi.to",
    description: "Your AI companion delivering daily blasts on tech, science, and finance. Weather permitting.",
  },
};

export default function KochiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
