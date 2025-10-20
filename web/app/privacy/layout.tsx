import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Kochi.to",
  description: "Privacy policy for Kochi.to - your personal AI agent over SMS.",
  openGraph: {
    title: "Privacy Policy - Kochi.to",
    description: "Privacy policy for Kochi.to - your personal AI agent over SMS.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy - Kochi.to",
    description: "Privacy policy for Kochi.to - your personal AI agent over SMS.",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
