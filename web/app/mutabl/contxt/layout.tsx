import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "contxt",
  description: "Your personal relationship CRM — fully customizable by AI",
};

export default function ContxtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
