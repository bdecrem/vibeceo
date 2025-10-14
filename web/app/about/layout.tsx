import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About - Kochi.to",
  description: "Your personal AI agent over SMS. Daily AI research papers, academic drama, crypto insights, and more.",
  openGraph: {
    title: "About - Kochi.to",
    description: "Your personal AI agent over SMS. Daily AI research papers, academic drama, crypto insights, and more.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About - Kochi.to",
    description: "Your personal AI agent over SMS. Daily AI research papers, academic drama, crypto insights, and more.",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
