import type { Metadata } from "next";

const description = "Little blasts of AI. Text us for AI Daily, research papers, and web apps.";

export const metadata: Metadata = {
  title: "B52s - Little Blasts of AI",
  description,
  icons: {
    icon: "/b52s-favicon.png",
    shortcut: "/b52s-favicon.png",
    apple: "/b52s-favicon.png",
  },
  openGraph: {
    title: "B52s - Little Blasts of AI",
    description,
    type: "website",
    siteName: "B52s.me",
    images: [
      {
        url: "/b52s-og-modern.png",
        width: 1200,
        height: 630,
        alt: "B52s - Little Blasts of AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "B52s - Little Blasts of AI",
    description,
    images: ["/b52s-og-modern.png"],
  },
};

export default function B52Layout({ children }: { children: React.ReactNode }) {
  return children;
}
