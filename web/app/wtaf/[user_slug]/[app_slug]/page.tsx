import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import WTAFAppViewer from "@/components/wtaf/app-viewer";

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
	searchParams: Promise<{
		demo?: string;
		[key: string]: string | string[] | undefined;
	}>;
}

export default async function WTAFAppPage({ params, searchParams }: PageProps) {
	const { user_slug, app_slug } = await params;
	const allSearchParams = await searchParams;
	const { demo } = allSearchParams;

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

		let htmlContent = data.html_content;

		// Inject query parameters into iframe context
		const safeParams: Record<string, string> = {};
		for (const [key, value] of Object.entries(allSearchParams)) {
			if (typeof value === 'string') {
				safeParams[encodeURIComponent(key)] = encodeURIComponent(value);
			}
		}

		const queryString = new URLSearchParams(safeParams).toString();
		
		if (queryString) {
			console.log('🔍 Injecting query parameters into iframe:', queryString);
			
			// Safely escape the query string for JavaScript
			const safeQueryString = queryString.replace(/'/g, "\\'");
			
			const queryInjection = `<script>
// Inject query parameters into iframe context
(function() {
    try {
        // Store the injected search string
        const injectedSearch = '?${safeQueryString}';
        
        // Override location.search getter
        try {
            Object.defineProperty(window.location, 'search', {
                get: function() { return injectedSearch; },
                configurable: true
            });
        } catch (e) {
            // If we can't override location.search, try a different approach
            console.warn('Could not override location.search, trying alternative approach');
            // Store the search params globally for the app to use
            window.INJECTED_SEARCH_PARAMS = injectedSearch;
        }
        
        // Override URLSearchParams to work with our injected params
        const OriginalURLSearchParams = window.URLSearchParams;
        window.URLSearchParams = function(init) {
            if (!init || init === window.location.search) {
                return new OriginalURLSearchParams(injectedSearch);
            }
            return new OriginalURLSearchParams(init);
        };
        
        console.log('Query parameters injected successfully:', injectedSearch);
    } catch (e) {
        console.error('Failed to inject query parameters:', e);
    }
})();
</script>`;
			
			// Inject before closing head tag to ensure it runs before app code
			htmlContent = htmlContent.replace('</head>', queryInjection + '</head>');
		}

		// If demo=true, modify the HTML to force demo mode
		if (demo === 'true') {
			console.log('🎭 Demo mode detected, injecting demo override');
			
			// Inject a simple demo mode override script at the end of the head
			const demoOverride = `
<script>
console.log('🎭 DEMO OVERRIDE SCRIPT RUNNING');
// Force demo mode immediately - wait for variables to be declared
setTimeout(function() {
	console.log('🎭 FORCING DEMO MODE NOW');
	
	// Create demo user with proper structure
	const demoUser = { 
		userLabel: 'Demo User', 
		participantId: 'demo-' + Math.random().toString(36).substr(2, 6) 
	};
	
	// CRITICAL: Set the LOCAL currentUser variable that the chat functions actually use
	if (typeof currentUser !== 'undefined') {
		window.currentUser = demoUser; // Set global too
		currentUser = demoUser; // Set the local variable that chat functions use
		console.log('🎭 Set both global and local currentUser:', currentUser);
	} else {
		// Fallback: try to set it later when the variable is declared
		console.log('🎭 currentUser not yet declared, will set on window and retry');
		window.currentUser = demoUser;
		setTimeout(() => {
			if (typeof currentUser !== 'undefined') {
				currentUser = demoUser;
				console.log('🎭 Set local currentUser on retry:', currentUser);
			}
		}, 500);
	}
	
	// Update ZAD auth system properly
	if (typeof updateZadAuth === 'function') {
		updateZadAuth(demoUser.userLabel, demoUser.participantId);
	}
	
	// Hide auth screens
	const authScreens = document.querySelectorAll('#welcome-screen, #new-user-screen, #returning-user-screen');
	authScreens.forEach(screen => {
		screen.style.display = 'none';
		screen.classList.remove('active');
	});
	
	// Show main screen
	const mainScreen = document.querySelector('#main-screen');
	if (mainScreen) {
		mainScreen.style.display = 'block';
		mainScreen.classList.add('active');
	}
	
	// Update status and user label
	const userStatus = document.querySelector('#user-status');
	if (userStatus) {
		userStatus.innerHTML = '<span style="background-color: #ff6b6b; color: white; padding: 8px 16px; border-radius: 8px; font-weight: bold; display: inline-block;">🎭 DEMO MODE – Real thing works. This DEMO thing? Kinda, sometimes.</span>';
	}
	
	const userLabel = document.querySelector('#current-user-label');
	if (userLabel) userLabel.textContent = demoUser.userLabel;
	
	// Start polling and load data like a normal user
	if (typeof startPolling === 'function') {
		startPolling();
	}
	if (typeof loadLatestData === 'function') {
		loadLatestData();
	}
	
	console.log('🎭 DEMO MODE APPLIED SUCCESSFULLY');
}, 200); // Increased delay to ensure variables are declared
</script>`;
			
			// Insert before closing head tag
			htmlContent = htmlContent.replace('</head>', demoOverride + '</head>');
			
			console.log('🎭 Demo override injection complete');
		}

		// Check if user came from wtaf.me internal navigation pages vs direct link
		// Also show navigation for demo mode (TRY THIS APP buttons)
		const headersList = await headers();
		const referer = headersList.get('referer');
		const isDemoMode = demo === 'true';
		
		// Define internal navigation pages that should show the navbar
		const internalNavPages = [
			'/trending',
			'/featured', 
			'/wtaf-landing',
			'/wtaf/',  // WTAF homepage
			'/creations',
			'/wtaf/trending',
			'/wtaf/featured',
			'/',  // Main homepage (for Fresh From The Oven and example cards)
		];
		
		// Check if referer is from a wtaf.me internal navigation page
		const isFromInternalNav = referer ? 
			internalNavPages.some(page => {
				// Extract the pathname from the full referer URL
				try {
					const refererUrl = new URL(referer);
					const pathname = refererUrl.pathname;
					
					// FIRST: Exclude all Webtoy pages (pattern: /user/app-slug)
					// This prevents navigation bar from showing when clicking links from user-created pages
					if (pathname.match(/^\/[^\/]+\/[^\/]+$/)) {
						return false;
					}
					
					// For exact matches (trending, featured, etc)
					if (page === pathname) return true;
					
					// For /wtaf-landing, check exact match
					if (page === '/wtaf-landing' && pathname === '/wtaf-landing') return true;
					
					// For root path, check exact match
					if (page === '/' && pathname === '/') return true;
					
					// For /creations, match any user's creations page (but not Webtoy pages)
					if (page === '/creations' && pathname.match(/^\/[^\/]+$/) && !pathname.startsWith('/wtaf')) return true;
					
					// For /wtaf/ homepage specifically (not any wtaf subpage)
					if (page === '/wtaf/' && pathname === '/wtaf') return true;
					
					return false;
				} catch (e) {
					// If URL parsing fails, don't show nav
					return false;
				}
			}) :
			false;
			
		const showNavigation = isDemoMode || isFromInternalNav;

		console.log('🔍 Navigation decision:', { 
			referer, 
			isDemoMode, 
			isFromInternalNav, 
			showNavigation 
		});

		// Conditionally render with or without navigation
		if (showNavigation) {
			// Internal navigation - show nav bar
			return (
				<>
					<link
						href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&display=swap"
						rel="stylesheet"
					/>
					<WTAFAppViewer 
						userSlug={user_slug}
						appSlug={app_slug}
						htmlContent={htmlContent}
					/>
				</>
			);
		} else {
			// Direct link - clean iframe only
			return (
				<div style={{
					width: "100%",
					height: "100vh",
					margin: 0,
					padding: 0,
					overflow: "hidden"
				}}>
					<iframe
						srcDoc={htmlContent}
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
		}
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
