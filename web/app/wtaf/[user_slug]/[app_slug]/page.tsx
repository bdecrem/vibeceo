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
		// Fetch the WTAF content from Supabase with theme
		const { data, error } = await supabase
			.from("wtaf_content")
			.select("id, html_content, coach, original_prompt, created_at, type, current_revision, theme_id, css_override")
			.eq("user_slug", user_slug)
			.eq("app_slug", app_slug)
			.eq("status", "published")
			.single();

		if (error || !data) {
			console.error("WTAF content not found:", error);
			return notFound();
		}

		// Check if this is a desktop app that should be served directly
		const isDesktopApp = app_slug.includes('toybox-os') || 
		                     app_slug.includes('webtoys-os') || 
		                     app_slug.includes('desktop-v3');
		
		console.log('🖥️ Desktop detection:', { app_slug, isDesktopApp });

		let htmlContent = data.html_content;

		// Check if there's a current revision to load instead
		if (data.current_revision !== null) {
			console.log(`🔄 Loading revision ${data.current_revision} for ${user_slug}/${app_slug}`);
			
			const { data: revisionData, error: revisionError } = await supabase
				.from("wtaf_revisions")
				.select("html_content")
				.eq("content_id", data.id)
				.eq("revision_id", data.current_revision)
				.eq("status", "completed")
				.single();

			if (revisionError) {
				console.error(`Failed to load revision ${data.current_revision}:`, revisionError);
				// Fall back to original content
			} else if (revisionData?.html_content) {
				console.log(`✅ Using revised content from revision ${data.current_revision}`);
				htmlContent = revisionData.html_content;
			}
		}

		// Load theme CSS if theme_id is set
		let themeCSS = '';
		if (data.theme_id) {
			console.log(`🎨 Loading theme: ${data.theme_id}`);
			
			const { data: themeData, error: themeError } = await supabase
				.from("wtaf_themes")
				.select("css_content")
				.eq("id", data.theme_id)
				.eq("is_active", true)
				.single();

			if (themeError) {
				console.error(`Failed to load theme ${data.theme_id}:`, themeError);
				// Try to load default theme as fallback
				const { data: defaultTheme } = await supabase
					.from("wtaf_themes")
					.select("css_content")
					.eq("is_default", true)
					.single();
				
				if (defaultTheme?.css_content) {
					themeCSS = defaultTheme.css_content;
					console.log('✅ Using default theme as fallback');
				}
			} else if (themeData?.css_content) {
				themeCSS = themeData.css_content;
				console.log(`✅ Theme ${data.theme_id} loaded successfully`);
			}
		}

		// Add any app-specific CSS overrides
		if (data.css_override) {
			themeCSS += '\n\n/* App-specific overrides */\n' + data.css_override;
		}

		// Inject theme CSS into HTML if we have any
		if (themeCSS) {
			// Check if there's already a </head> tag
			if (htmlContent.includes('</head>')) {
				// Inject before </head>
				htmlContent = htmlContent.replace(
					'</head>',
					`<style id="theme-css">\n${themeCSS}\n</style>\n</head>`
				);
			} else if (htmlContent.includes('<body')) {
				// If no head tag, inject at the beginning of body
				htmlContent = htmlContent.replace(
					'<body',
					`<style id="theme-css">\n${themeCSS}\n</style>\n<body`
				);
			} else {
				// As a last resort, prepend to the entire content
				htmlContent = `<style id="theme-css">\n${themeCSS}\n</style>\n${htmlContent}`;
			}
		}

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

// Superpower Mode Authentication Bridge
// This runs in the iframe and requests auth from the parent window
(function() {
    // Request authentication from parent window if superpower mode is detected
    const urlParams = new URLSearchParams(window.location.search);
    const isSuperpowerMode = urlParams.get('superpower') === 'true';
    
    if (isSuperpowerMode) {
        console.log('🔌 Superpower mode detected in iframe, setting up auth bridge');
        
        // Store auth data when received from parent
        window.SUPERPOWER_AUTH = {
            isAuthenticated: false,
            authToken: null,
            apiUrl: null,
            pending: true
        };
        
        // Listen for auth data from parent window
        window.addEventListener('message', function(event) {
            // Validate origin for security (allow localhost for development)
            if (event.origin !== window.location.origin && 
                !event.origin.startsWith('http://localhost:') &&
                !event.origin.startsWith('https://localhost:')) {
                console.warn('🚨 Ignoring message from untrusted origin:', event.origin);
                return;
            }
            
            if (event.data && event.data.type === 'SUPERPOWER_AUTH_RESPONSE') {
                console.log('🔌 Received auth response from parent:', event.data);
                
                window.SUPERPOWER_AUTH = {
                    isAuthenticated: event.data.isAuthenticated,
                    authToken: event.data.authToken,
                    apiUrl: event.data.apiUrl,
                    pending: false
                };
                
                // Trigger auth check in the app if the function exists
                if (typeof window.onSuperpowerAuthReceived === 'function') {
                    window.onSuperpowerAuthReceived(window.SUPERPOWER_AUTH);
                }
                
                // Dispatch custom event for any listeners
                window.dispatchEvent(new CustomEvent('superpowerAuthReceived', {
                    detail: window.SUPERPOWER_AUTH
                }));
            }
        });
        
        // Request auth from parent window
        function requestAuthFromParent() {
            if (window.parent && window.parent !== window) {
                console.log('🔌 Requesting auth from parent window');
                window.parent.postMessage({
                    type: 'SUPERPOWER_AUTH_REQUEST',
                    origin: window.location.origin
                }, '*');
            } else {
                console.log('🔌 No parent window, iframe might be top-level');
                window.SUPERPOWER_AUTH.pending = false;
            }
        }
        
        // Request auth after a short delay to ensure parent is ready
        setTimeout(requestAuthFromParent, 100);
        
        // Fallback: request again after longer delay if still pending
        setTimeout(function() {
            if (window.SUPERPOWER_AUTH.pending) {
                console.log('🔌 Auth still pending, retrying request');
                requestAuthFromParent();
            }
        }, 1000);
    }
})();
</script>`;
			
			// Inject before closing head tag to ensure it runs before app code
			htmlContent = htmlContent.replace('</head>', queryInjection + '</head>');
		}

		// If demo=true AND this is a ZAD app, modify the HTML to force demo mode
		if (demo === 'true' && data.type === 'ZAD') {
			console.log('🎭 Demo mode detected for ZAD app, injecting demo override');
			
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
	
	// Create WEBTOYS-style demo mode banner
	const existingBanner = document.getElementById('demo-mode-banner');
	if (!existingBanner) {
		// Add styles
		const style = document.createElement('style');
		style.textContent = \`
			@keyframes slideDown { 
				from { 
					transform: translateX(-50%) translateY(-100%); 
					opacity: 0;
				} 
				to { 
					transform: translateX(-50%) translateY(0); 
					opacity: 1;
				} 
			}
			#demo-mode-banner {
				position: fixed;
				top: 20px;
				left: 50%;
				transform: translateX(-50%);
				background: #FF5722;
				color: white;
				padding: 12px 50px 12px 20px; /* Extra padding on right for button */
				border: 2px solid #000;
				z-index: 10000;
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
				animation: slideDown 0.3s ease-out;
				max-width: 90%;
				width: auto;
				overflow: visible;
				position: relative; /* For absolute positioning of button */
			}
			#demo-mode-banner .content-wrapper {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 12px;
			}
			#demo-mode-banner .close-btn {
				position: absolute;
				top: 10px;
				right: 10px;
				background: black;
				border: 2px solid white;
				border-radius: 50%;
				color: white;
				font-size: 16px;
				font-weight: bold;
				cursor: pointer;
				padding: 0;
				margin: 0;
				line-height: 1;
				width: 24px !important;
				height: 24px !important;
				min-width: 24px;
				max-width: 24px;
				min-height: 24px;
				max-height: 24px;
				display: flex !important;
				align-items: center;
				justify-content: center;
				text-shadow: none;
				outline: none;
				transition: transform 0.1s ease;
				box-sizing: border-box;
				flex-shrink: 0;
				flex-grow: 0;
			}
			#demo-mode-banner .close-btn:hover {
				transform: scale(1.1);
			}
			#demo-mode-banner .emoji {
				font-size: 40px;
			}
			#demo-mode-banner span:last-child {
				font-size: 16px;
				font-weight: 600;
			}
			
			/* Mobile-specific adjustments */
			@media (max-width: 480px) {
				#demo-mode-banner {
					padding: 20px 20px;
					max-width: calc(100% - 40px);
					width: calc(100% - 40px);
					top: 20px;
					left: 50%;
					transform: translateX(-50%);
				}
				#demo-mode-banner .content-wrapper {
					flex-direction: row;
					align-items: center;
					text-align: left;
					gap: 12px;
					padding-right: 0;
				}
				#demo-mode-banner .close-btn {
					/* Clean mobile close button */
					position: absolute;
					top: 12px;
					right: 12px;
					background: rgba(255, 255, 255, 0.9);
					border: 2px solid #000;
					border-radius: 50%;
					color: #000;
					width: 28px;
					height: 28px;
					font-size: 16px;
					font-weight: bold;
					box-shadow: 0 2px 4px rgba(0,0,0,0.1);
					transform: none;
				}
				#demo-mode-banner .close-btn:hover {
					background: rgba(255, 255, 255, 1);
					transform: none;
				}
				#demo-mode-banner .emoji {
					font-size: 32px;
					flex-shrink: 0;
				}
				#demo-mode-banner span:last-child {
					font-size: 13px;
					line-height: 1.3;
					font-weight: 500;
					padding-right: 30px; /* Space for close button */
				}
			}
		\`;
		document.head.appendChild(style);
		
		// Create banner
		const demoBanner = document.createElement('div');
		demoBanner.id = 'demo-mode-banner';
		
		// Create content wrapper
		const contentWrapper = document.createElement('div');
		contentWrapper.className = 'content-wrapper';
		
		// Create emoji
		const emoji = document.createElement('span');
		emoji.className = 'emoji';
		emoji.textContent = '🤪';
		
		// Create text
		const text = document.createElement('span');
		text.textContent = 'DEMO MODE – The apps we build (mostly) work. This DEMO thing? Kinda, sometimes.';
		
		// Create close button (positioned absolutely in upper right)
		const closeButton = document.createElement('button');
		closeButton.className = 'close-btn';
		closeButton.textContent = '✕';
		closeButton.onclick = function() { 
			demoBanner.style.display = 'none'; 
		};
		
		contentWrapper.appendChild(emoji);
		contentWrapper.appendChild(text);
		
		// Append close button to BANNER, not content wrapper!
		demoBanner.appendChild(contentWrapper);
		demoBanner.appendChild(closeButton);
		
		document.body.insertBefore(demoBanner, document.body.firstChild);
	}
	
	// Update status and user label if they exist
	const userStatus = document.querySelector('#user-status');
	if (userStatus) {
		userStatus.style.display = 'none'; // Hide the old status
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
		} else if (demo === 'true' && data.type !== 'ZAD') {
			console.log('🎭 Demo mode requested but app type is', data.type, '- skipping demo injection');
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
		
		// Check if referer is from the desktop - these should NOT show navigation
		console.log('🔍 DEBUG - Referer analysis:', {
			referer,
			refererExists: !!referer
		});
		
		const isFromDesktop = referer ? 
			(() => {
				try {
					const refererUrl = new URL(referer);
					const pathname = refererUrl.pathname;
					const searchParams = refererUrl.searchParams;
					
					console.log('🔍 DEBUG - Parsed referer:', {
						fullReferer: referer,
						pathname,
						searchParamsString: refererUrl.search,
						slug: searchParams.get('slug'),
						user: searchParams.get('user')
					});
					
					// Check if referer is from /api/wtaf/raw with desktop slugs
					if (pathname === '/api/wtaf/raw') {
						const slug = searchParams.get('slug');
						console.log('🔍 DEBUG - Raw API check:', {
							isRawAPI: true,
							slug,
							hasDesktopSlug: slug && (slug.includes('toybox-os') || slug.includes('webtoys-os') || slug.includes('desktop-v3'))
						});
						
						if (slug && (slug.includes('toybox-os') || slug.includes('webtoys-os') || slug.includes('desktop-v3'))) {
							console.log('🖥️ ✅ Detected desktop referer from raw API:', referer);
							return true;
						}
					}
					
					// Check if referer pathname contains desktop identifiers
					const pathnameHasDesktop = pathname.includes('toybox-os') || pathname.includes('webtoys-os') || pathname.includes('desktop-v3');
					console.log('🔍 DEBUG - Pathname check:', {
						pathname,
						pathnameHasDesktop
					});
					
					if (pathnameHasDesktop) {
						console.log('🖥️ ✅ Detected desktop referer from pathname:', referer);
						return true;
					}
					
					console.log('🔍 DEBUG - No desktop detected');
					return false;
				} catch (e) {
					console.log('🔍 DEBUG - URL parsing error:', e.message);
					return false;
				}
			})() :
			false;

		// Check if referer is from a wtaf.me internal navigation page
		const isFromInternalNav = referer && !isFromDesktop ? 
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
			
		const showNavigation = isDemoMode || (isFromInternalNav && !isFromDesktop);

		console.log('🔍 FINAL Navigation decision:', { 
			referer, 
			isDemoMode, 
			isFromDesktop,
			isFromInternalNav, 
			showNavigation,
			'WILL_SHOW_NAVBAR': showNavigation ? 'YES - with WTAFAppViewer' : 'NO - clean iframe only'
		});
		
		// TEMPORARY DEBUG: If this is a sudoku app, add debug info to HTML
		if (app_slug === 'toybox-sudoku') {
			const debugInfo = `
<!-- DEBUG INFO:
referer: ${referer}
isDemoMode: ${isDemoMode}
isFromDesktop: ${isFromDesktop}
isFromInternalNav: ${isFromInternalNav}
showNavigation: ${showNavigation}
-->`;
			htmlContent = debugInfo + htmlContent;
		}

		// Serve desktop apps directly without iframe wrapper
		if (isDesktopApp) {
			console.log('🖥️ TAKING PATH: Desktop app redirect (isDesktopApp=true)');
			// Return a client-side redirect script
			return (
				<html>
					<head>
						<meta httpEquiv="refresh" content={`0;url=/api/wtaf/raw?user=${encodeURIComponent(user_slug)}&slug=${encodeURIComponent(app_slug)}`} />
						<script dangerouslySetInnerHTML={{
							__html: `window.location.href = '/api/wtaf/raw?user=${encodeURIComponent(user_slug)}&slug=${encodeURIComponent(app_slug)}';`
						}} />
					</head>
					<body>
						Redirecting to desktop...
					</body>
				</html>
			);
		}

		// Conditionally render with or without navigation
		if (showNavigation) {
			console.log('🔍 TAKING PATH: WTAFAppViewer with navbar (showNavigation=true)');
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
			console.log('🔍 TAKING PATH: Clean iframe only (showNavigation=false)');
			// Direct link - clean iframe only with superpower auth bridge
			return (
				<>
					{/* Superpower Mode Authentication Bridge Script */}
					<script
						dangerouslySetInnerHTML={{
							__html: `
								// Parent window auth bridge for Superpower Mode
								(function() {
									console.log('🔌 Parent window auth bridge loaded');
									
									// Listen for auth requests from iframe
									window.addEventListener('message', async function(event) {
										// Validate origin for security
										if (event.origin !== window.location.origin && 
											!event.origin.startsWith('http://localhost:') &&
											!event.origin.startsWith('https://localhost:')) {
											console.warn('🚨 Ignoring message from untrusted origin:', event.origin);
											return;
										}
										
										// Handle navigation requests from stackobjectify apps
										if (event.data && event.data.type === 'NAVIGATE_REQUEST') {
											console.log('📍 Navigation request from iframe:', event.data.url);
											
											// Navigate to the requested URL
											const currentPath = window.location.pathname;
											const newUrl = event.data.url ? currentPath + event.data.url : currentPath;
											
											console.log('🚀 Navigating to:', newUrl);
											
											// Use window.location to navigate (since we don't have router in this context)
											window.location.href = newUrl;
											return;
										}
										
										if (event.data && event.data.type === 'SUPERPOWER_AUTH_REQUEST') {
											console.log('🔌 Received auth request from iframe');
											
											let authData = {
												type: 'SUPERPOWER_AUTH_RESPONSE',
												isAuthenticated: false,
												authToken: null,
												apiUrl: null
											};
											
											try {
												// Check if Chrome extension API is available
												if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
													console.log('🔌 Chrome storage API available, checking for auth...');
													
													// Use Promise wrapper for chrome.storage.local.get
													const result = await new Promise((resolve) => {
														chrome.storage.local.get(['authToken', 'apiUrl'], (data) => {
															resolve(data);
														});
													});
													
													if (result.authToken && result.apiUrl) {
														console.log('🔌 Auth found in chrome.storage.local');
														authData.isAuthenticated = true;
														authData.authToken = result.authToken;
														authData.apiUrl = result.apiUrl;
													} else {
														console.log('🔌 No auth found in chrome.storage.local');
													}
												} else {
													console.log('🔌 Chrome storage API not available, checking localStorage fallback...');
													
													// Fallback to localStorage for development
													const storedToken = localStorage.getItem('webtoysAuthToken');
													const storedUrl = localStorage.getItem('webtoysApiUrl');
													const localTest = localStorage.getItem('webtoysLocalTest');
													
													if (storedToken && storedUrl) {
														console.log('🔌 Auth found in localStorage fallback');
														authData.isAuthenticated = true;
														authData.authToken = storedToken;
														authData.apiUrl = storedUrl;
													} else if (localTest === 'true') {
														// For local testing, auto-authenticate
														console.log('🔌 Local test mode - auto-authenticating');
														authData.isAuthenticated = true;
														authData.authToken = 'test-token-local-dev';
														authData.apiUrl = 'http://localhost:3000';
													} else {
														console.log('🔌 No auth found in localStorage fallback');
													}
												}
											} catch (error) {
												console.error('🔌 Error checking auth:', error);
											}
											
											console.log('🔌 Sending auth response to iframe:', authData);
											
											// Send auth response back to iframe
											const iframe = document.querySelector('iframe');
											if (iframe && iframe.contentWindow) {
												iframe.contentWindow.postMessage(authData, '*');
											} else {
												console.warn('🔌 Could not find iframe to send auth response');
											}
										}
									});
									
									console.log('🔌 Parent window auth bridge ready');
								})();
							`
						}}
					/>
					
					<div style={{
						width: "100%",
						height: "100vh",
						margin: 0,
						padding: 0,
						overflow: "hidden"
					}}>
						<iframe
							srcDoc={app_slug === 'issue-tracker' ? 
								(() => {
									let html = htmlContent.replace(
										"window.APP_ID = 'webtoys-issue-tracker';",
										"window.APP_ID = '83218c2e-281e-4265-a95f-1d3f763870d4';"
									);
									
									// Add filtering and admin comments display
									const issueEnhancements = `<script>
// Filter hidden issues and display admin comments
(function() {
    console.log('🔧 Installing issue tracker enhancements...');
    
    // Wait for functions to be defined
    setTimeout(() => {
        // Override filterOffensiveContent to also filter hidden issues
        const originalFilter = window.filterOffensiveContent;
        if (originalFilter) {
            window.filterOffensiveContent = function(issues) {
                let filtered = originalFilter(issues);
                
                // Also filter out hidden/deleted issues for non-superpower users
                if (!window.isSuperpowerMode && Array.isArray(filtered)) {
                    const beforeCount = filtered.length;
                    filtered = filtered.filter(issue => {
                        return !issue.content_data?.hidden && !issue.content_data?.deleted;
                    });
                    const hiddenCount = beforeCount - filtered.length;
                    if (hiddenCount > 0) {
                        console.log('🚫 Filtered out ' + hiddenCount + ' hidden/deleted issues');
                    }
                }
                return filtered;
            };
            console.log('✅ Hidden issue filter installed');
        }
        
        // Override applyFilter to inject admin comments
        const originalApplyFilter = window.applyFilter;
        if (originalApplyFilter) {
            window.applyFilter = function(filter) {
                originalApplyFilter.call(this, filter);
                
                // After the filter is applied, inject admin comments
                setTimeout(() => {
                    const issueElements = document.querySelectorAll('.issue-item');
                    issueElements.forEach((element, index) => {
                        // Find the corresponding issue data
                        if (window.allIssues && window.allIssues[index]) {
                            const issue = window.allIssues[index];
                            if (issue.content_data?.admin_comments && issue.content_data.admin_comments.length > 0) {
                                // Check if comments already added
                                if (!element.querySelector('.admin-comment')) {
                                    const commentsHtml = issue.content_data.admin_comments.map(comment => 
                                        '<div class="admin-comment" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; border-radius: 10px; margin: 10px 15px; font-size: 14px;">' +
                                        '<div style="font-weight: bold; margin-bottom: 5px;">⚡ Admin Comment (' + new Date(comment.timestamp).toLocaleDateString() + ')</div>' +
                                        '<div>' + comment.text + '</div>' +
                                        '</div>'
                                    ).join('');
                                    
                                    // Insert after the issue content
                                    element.insertAdjacentHTML('beforeend', commentsHtml);
                                    console.log('💬 Added admin comment to issue #' + (index + 1));
                                }
                            }
                        }
                    });
                }, 100);
            };
            console.log('✅ Admin comments injector installed');
        }
    }, 500); // Wait for page to load
})();
</script>`;
									
									// Inject enhancements before </head>
									html = html.replace('</head>', issueEnhancements + '</head>');
									return html;
								})()
								: htmlContent}
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
				</>
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
			.select("original_prompt, coach, created_at, current_revision")
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
		
		// Special handling for WebtoysOS desktop
		const isWebtoysDesktop = app_slug === 'toybox-os-v3-test';
		
		// Use custom title for WebtoysOS, otherwise use standard branding
		const title = isWebtoysDesktop ? 'BUILD PLAY SHARE' : 'WTAF – Delusional App Generator';
		const ogTitle = isWebtoysDesktop ? 'BUILD PLAY SHARE' : "SHIP FROM YOUR FLIP PHONE";
		const description = isWebtoysDesktop 
			? "BUILD PLAY SHARE - WebtoysOS Community Desktop" 
			: "Vibecoded chaos, shipped via SMS.";

		return {
			title,
			description,
			openGraph: {
				title: ogTitle,
				description,
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
				title: ogTitle,
				description,
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
