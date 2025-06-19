import type { Metadata } from "next";

// Metadata is handled by embedded HTML content from monitor script
// Remove OpenGraph metadata to prevent duplicates with embedded tags
export const metadata: Metadata = {
	title: "",
	description: "",
	openGraph: undefined,
	twitter: undefined,
};

export default function WtafLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <div className="wtaf-container">{children}</div>;
}
