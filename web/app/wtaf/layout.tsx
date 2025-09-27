import type { Metadata } from "next";

// Metadata is handled by embedded HTML content from monitor script
// Remove OpenGraph metadata to prevent duplicates with embedded tags
export const metadata: Metadata = {
	title: "WTAF - Delusional App Generator",
	description: "Vibecoded chaos, shipped via SMS.",
	openGraph: {
		title: "WTAF - Delusional App Generator",
		description: "Vibecoded chaos, shipped via SMS.",
		type: "website",
		siteName: "WTAF",
		images: [
			{
				url: "/images/wtaf-og.png",
				width: 1024,
				height: 1024,
				alt: "WTAF - Delusional App Generator by AdvisorsFoundry",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "WTAF - Delusional App Generator",
		description: "Vibecoded chaos, shipped via SMS.",
		images: ["/images/wtaf-og.png"],
	},
};

export default function WtafLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// TEMP: Remove wtaf-container to test desktop navbar issue
	return children;
}
