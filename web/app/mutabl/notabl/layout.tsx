import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "notabl",
  description: "Your personal document editor — fully customizable by AI",
};

export default function NotablLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
