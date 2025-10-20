import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Kochi.to",
  description: "Terms of service for Kochi.to - your personal AI agent over SMS.",
  openGraph: {
    title: "Terms of Service - Kochi.to",
    description: "Terms of service for Kochi.to - your personal AI agent over SMS.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service - Kochi.to",
    description: "Terms of service for Kochi.to - your personal AI agent over SMS.",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
