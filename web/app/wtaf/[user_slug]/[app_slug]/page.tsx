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

		// Return the HTML content in an isolated iframe
		return (
			<div style={{
				width: "100%",
				height: "100vh",
				margin: 0,
				padding: 0,
				overflow: "hidden"
			}}>
				<iframe
					srcDoc={data.html_content}
					sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
					style={{
						width: "100%",
						height: "100%",
						border: "none",
						backgroundColor: "white",
						display: "block"
					}}
					loading="eager"
					title={`WTAF App: ${app_slug} by ${user_slug}`}
					allowFullScreen
				/>
			</div>
		);
	} catch (error) {
		console.error("Error fetching WTAF content:", error);
		return notFound();
	}
}

// Generate proper metadata dynamically instead of relying on embedded HTML tags
export async function generateMetadata({ params }: PageProps) {
	const { user_slug, app_slug } = await params;

	try {
		// Fetch the WTAF content to get basic info
		const { data } = await supabase
			.from("wtaf_content")
			.select("original_prompt, coach, created_at")
			.eq("user_slug", user_slug)
			.eq("app_slug", app_slug)
			.eq("status", "published")
			.single();

		// Call our API endpoint to get the actual image URL (works for both cached and generated images)
		const apiEndpointUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.wtaf.me'}/api/generate-og-cached?user=${user_slug}&app=${app_slug}`;
		
		let ogImageUrl = apiEndpointUrl; // fallback to API endpoint
		
		try {
			// Call the API to get the actual image URL  
			const response = await fetch(apiEndpointUrl);
			if (response.ok) {
				const data = await response.json();
				if (data.success && data.image_url) {
					// Use the actual Supabase Storage URL returned by the API
					ogImageUrl = data.image_url;
				}
			}
		} catch (error) {
			console.log('Failed to get image URL from API, using endpoint as fallback');
			// ogImageUrl stays as apiEndpointUrl
		}
		
		const pageUrl = `https://www.wtaf.me/wtaf/${user_slug}/${app_slug}`;
		
		// Use consistent branding title instead of user prompt
		const title = 'WTAF – Delusional App Generator';

		return {
			title,
			description: "Vibecoded chaos, shipped via SMS.",
			openGraph: {
				title: "WTAF by AF",
				description: "Vibecoded chaos, shipped via SMS.",
				url: pageUrl,
				images: [
					{
						url: ogImageUrl,
						width: 1200,
						height: 630,
						alt: 'WTAF App Preview',
					},
				],
				type: 'website',
			},
			twitter: {
				card: 'summary_large_image',
				title: "WTAF by AF",
				description: "Vibecoded chaos, shipped via SMS.",
				images: [ogImageUrl],
			},
		};
	} catch (error) {
		console.error("Error generating metadata:", error);
		// Fallback metadata
		return {
			title: "WTAF – Delusional App Generator",
			description: "Vibecoded chaos, shipped via SMS.",
		};
	}
}
