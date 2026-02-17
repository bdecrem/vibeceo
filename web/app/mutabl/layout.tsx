import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

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
      <style>{`html,body{margin:0;padding:0;height:100%;height:100dvh;overflow:hidden;overscroll-behavior:none;}`}</style>
      {children}
    </>
  );
}
