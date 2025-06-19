import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

// Initialize Supabase client
const supabase = createClient(
	process.env.SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_KEY!
);

// Force dynamic rendering and disable caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
	params: Promise<{
		user_slug: string;
		app_slug: string;
	}>;
}

export default async function WTAFAppPage({ params }: PageProps) {
	const { user_slug, app_slug } = await params;

	try {
		// Fetch the WTAF content from Supabase
		const { data, error } = await supabase
			.from("wtaf_content")
			.select("html_content, coach, original_prompt, created_at")
			.eq("user_slug", user_slug)
			.eq("app_slug", app_slug)
			.eq("status", "published")
			.single();

		if (error || !data) {
			console.error("WTAF content not found:", error);
			return notFound();
		}

		// Return the HTML content directly
		return (
			<div
				dangerouslySetInnerHTML={{ __html: data.html_content }}
				style={{
					minHeight: "100vh",
					width: "100%",
					margin: 0,
					padding: 0,
				}}
			/>
		);
	} catch (error) {
		console.error("Error fetching WTAF content:", error);
		return notFound();
	}
}

// Skip metadata generation entirely - all metadata is embedded in HTML by monitor script
export async function generateMetadata({ params }: PageProps) {
	// Return empty metadata object to prevent Next.js from generating any meta tags
	// The monitor script embeds all necessary OpenGraph and meta tags directly in the HTML
	return {};
}
