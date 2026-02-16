import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://kochi.to"),
  title: "todoit",
  description: "Your personal todo app — fully customizable by AI",
};

export default function TodoitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
