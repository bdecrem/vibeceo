import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kochi Animation Test Lab - Kochi.to",
  description: "Testing ground for Kochi animations and interactions",
  openGraph: {
    title: "Kochi.to",
    description: "Your AI companion delivering daily blasts on tech, science, and finance. Weather permitting.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kochi.to",
    description: "Your AI companion delivering daily blasts on tech, science, and finance. Weather permitting.",
  },
};

export default function KochiTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&family=Montserrat:wght@600&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
