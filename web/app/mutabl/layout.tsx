import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://kochi.to"),
  title: {
    template: "%s — mutabl",
    default: "mutabl",
  },
  description: "Apps you make yours — fully customizable by AI",
};

export default function MutableLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`html,body{overflow-x:hidden;overscroll-behavior-x:none;}`}</style>
      {children}
    </>
  );
}
