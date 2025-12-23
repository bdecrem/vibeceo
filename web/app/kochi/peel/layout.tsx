import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peel | Kochi.to",
  description: "Separate images into layers with AI",
  openGraph: {
    title: "Peel - AI Image Layer Separation",
    description: "Upload an image and watch AI peel it into separate layers",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Peel | Kochi.to",
    description: "Separate images into layers with AI",
  },
};

export default function PeelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
