import type { Metadata } from "next";

// Metadata is handled by embedded HTML content from monitor script
// Remove OpenGraph metadata to prevent duplicates with embedded tags
export const metadata: Metadata = {
	title: "WTAF",
	description: "Vibecoded chaos, shipped via SMS.",
	// No openGraph or twitter metadata - this prevents duplicate tags
};

export default function WtafLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <div className="wtaf-container">{children}</div>;
}
