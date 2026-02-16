import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://kochi.to"),
  title: {
    template: "%s — mutabl",
    default: "mutabl",
  },
  description: "Apps that grow new features as you chat with them",
};

export default function MutableLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
