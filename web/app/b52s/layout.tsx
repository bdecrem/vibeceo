import type { Metadata } from "next";

const description = "Steam-powered artificial intelligence at your service. Telegraph your queries for research papers, moving pictures, and web contraptions.";

export const metadata: Metadata = {
  title: "B52s.me - Steam-Powered AI Intelligence",
  description,
  openGraph: {
    title: "B52s.me - Steam-Powered AI Intelligence",
    description,
    type: "website",
    siteName: "B52s.me",
  },
  twitter: {
    card: "summary_large_image",
    title: "B52s.me - Steam-Powered AI Intelligence",
    description,
  },
};

export default function B52Layout({ children }: { children: React.ReactNode }) {
  return children;
}
