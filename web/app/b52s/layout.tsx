import type { Metadata } from "next";

const description = "Steam-powered artificial intelligence at your service. Telegraph your queries for research papers, moving pictures, and web contraptions.";

export const metadata: Metadata = {
  title: "B52s.me - Steam-Powered AI Intelligence",
  description,
  icons: {
    icon: "/temp-b52s.png",
    shortcut: "/temp-b52s.png",
  },
  openGraph: {
    title: "B52s.me - Steam-Powered AI Intelligence",
    description,
    type: "website",
    siteName: "B52s.me",
    images: [
      {
        url: "/b52s-og.png",
        width: 1200,
        height: 630,
        alt: "B52s steampunk intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "B52s.me - Steam-Powered AI Intelligence",
    description,
    images: ["/b52s-og.png"],
  },
};

export default function B52Layout({ children }: { children: React.ReactNode }) {
  return children;
}
