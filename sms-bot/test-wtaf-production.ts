#!/usr/bin/env node

/**
 * WTAF PRODUCTION TEST SCRIPT
 *
 * This script bypasses the SMS portion but runs EXACTLY like production would.
 * It uses the same controller, processor, and storage functions as the live system.
 *
 * Usage: npm run test:wtaf "wtaf create a tetris game for me"
 *
 * The script will:
 * 1. Process the prompt through the same pipeline as production
 * 2. Generate and save the app/game to Supabase
 * 3. Return the URL and save it to test-results.txt
 */

import { writeFile, appendFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Import the exact same functions used in production
import {
	generateCompletePrompt,
	callClaude,
	type ClassifierConfig,
	type BuilderConfig,
} from "./engine/wtaf-processor.js";
import {
	saveCodeToSupabase,
	generateOGImage,
	updateOGImageInHTML,
	createRequiredDirectories,
} from "./engine/storage-manager.js";
import {
	WEB_APP_URL,
	WTAF_DOMAIN,
	WEB_OUTPUT_DIR,
	CLAUDE_OUTPUT_DIR,
	PROCESSED_DIR,
	WATCH_DIRS,
} from "./engine/shared/config.js";
import {
	logStartupInfo,
	logWithTimestamp,
	logSuccess,
	logError,
	logWarning,
} from "./engine/shared/logger.js";
import { extractCodeBlocks } from "./engine/shared/utils.js";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from "./engine/shared/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client for test user creation
let supabaseClient: any = null;
function getSupabaseClient() {
	if (!supabaseClient) {
		if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
			throw new Error(
				"SUPABASE_URL and SUPABASE_SERVICE_KEY are required for testing"
			);
		}
		supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
	}
	return supabaseClient;
}

/**
 * Ensure the generic test user exists in the database
 */
async function ensureTestUser(userSlug: string): Promise<void> {
	try {
		// Check if the test user already exists
		const { data: existingUser, error: checkError } = await getSupabaseClient()
			.from("sms_subscribers")
			.select("id")
			.eq("slug", userSlug)
			.single();

		if (checkError && checkError.code !== "PGRST116") {
			// PGRST116 = no rows found
			throw checkError;
		}

		if (existingUser) {
			logWithTimestamp(`👤 Using existing test user: ${userSlug}`);
			return;
		}

		// Create the test user if it doesn't exist
		logWithTimestamp(`👤 Creating generic test user: ${userSlug}`);

		const { data, error } = await getSupabaseClient()
			.from("sms_subscribers")
			.insert({
				slug: userSlug,
				phone_number: "+1999999999", // Unique test phone number
				role: "user",
				created_at: new Date().toISOString(),
			});

		if (error) {
			logWarning(`Error creating test user: ${error.message}`);
			throw error;
		}

		logSuccess(`✅ Created generic test user: ${userSlug}`);
	} catch (error) {
		logError(
			`Failed to ensure test user exists: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
		throw error;
	}
}

// Load WTAF cookbook (same as controller.ts - production only uses app-tech-spec.json)
let wtafCookbook: string | null = null;

async function loadWtafCookbook(): Promise<string | null> {
	try {
		const { readFile } = await import("fs/promises");

		// Load WTAF cookbook from copied content folder (when compiled, content is in dist/content)
		const cookbookPath = join(__dirname, "content", "app-tech-spec.json");
		const content = await readFile(cookbookPath, "utf8");

		logWithTimestamp("📖 WTAF Cookbook loaded successfully by test script");
		return content;
	} catch (error) {
		logWarning(
			`Error loading WTAF cookbook: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
		return null;
	}
}

// REQUEST_CONFIGS - exact copy from controller.ts
const REQUEST_CONFIGS = {
	creation: {
		classifierModel: "gpt-4o",
		classifierMaxTokens: 600,
		classifierTemperature: 0.7,
		classifierTopP: 1,
		classifierPresencePenalty: 0.3,
		classifierFrequencyPenalty: 0,
		builderModel: "claude-3-5-sonnet-20241022",
		builderMaxTokens: 8192,
		builderTemperature: 0.7,
	},
	edit: {
		builderModel: "claude-3-5-sonnet-20241022",
		builderMaxTokens: 4096,
		builderTemperature: 0.5,
	},
	game: {
		classifierModel: "gpt-4o",
		classifierMaxTokens: 600,
		classifierTemperature: 0.7,
		classifierTopP: 1,
		classifierPresencePenalty: 0.3,
		classifierFrequencyPenalty: 0,
		builderModel: "gpt-4o",
		builderMaxTokens: 16000,
		builderTemperature: 0.8,
	},
	zad: {
		classifierModel: "gpt-4o",
		classifierMaxTokens: 600,
		classifierTemperature: 0.7,
		classifierTopP: 1,
		classifierPresencePenalty: 0.3,
		classifierFrequencyPenalty: 0,
		builderModel: "claude-3-5-sonnet-20241022",
		builderMaxTokens: 8000,
		builderTemperature: 0.2,
	},
} as const;

// CREATION_SYSTEM_PROMPT - exact copy from controller.ts
const CREATION_SYSTEM_PROMPT = `🚨🚨🚨 ABSOLUTE TOP PRIORITY 🚨🚨🚨
🚨🚨🚨 READ THIS FIRST BEFORE ANYTHING ELSE 🚨🚨🚨

IF YOU SEE "<!-- WTAF_ADMIN_PAGE_STARTS_HERE -->" IN THE USER'S REQUEST:
YOU MUST CREATE EXACTLY TWO COMPLETE HTML PAGES
SEPARATED BY THAT EXACT DELIMITER
NEVER CREATE JUST ONE PAGE
THIS IS NON-NEGOTIABLE

🚨🚨🚨 END CRITICAL INSTRUCTION 🚨🚨🚨

You are creating exactly what the user requests. Follow the WTAF Cookbook & Style Guide provided in the user message for all design and brand requirements.

📧 EMAIL PLACEHOLDER SYSTEM:
IF YOU SEE "EMAIL_NEEDED: true" IN THE USER MESSAGE METADATA:
- Use [CONTACT_EMAIL] as placeholder in ALL email contexts
- Examples:
  * Contact links: <a href="mailto:[CONTACT_EMAIL]">Email me: [CONTACT_EMAIL]</a>
  * Contact info: "Questions? Email us at [CONTACT_EMAIL]"
  * Business contact: "Hire me: [CONTACT_EMAIL]"
- NEVER use fake emails like "example@email.com" or "your-email@domain.com"
- ALWAYS use the exact placeholder [CONTACT_EMAIL] - this will be replaced later

TECHNICAL REQUIREMENTS FOR APPS WITH FORMS:

1. EXACT Supabase Integration (use these exact placeholders):
const supabase = window.supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY')

2. Public page form submission with error handling:
try {
  const { data, error } = await supabase.from('wtaf_submissions').insert({
    app_id: 'APP_TABLE_ID',
    submission_data: formData
  })
  if (error) throw error
  // Show success message
} catch (error) {
  console.error('Error:', error)
  alert('Submission failed. Please try again.')
}

3. Admin page fetch with error handling:
try {
  const { data, error } = await supabase.from('wtaf_submissions')
    .select('*')
    .eq('app_id', 'APP_TABLE_ID')
    .order('created_at', { ascending: false })
  if (error) throw error
  // Display data in table
} catch (error) {
  console.error('Error:', error)
  alert('Failed to load submissions')
}

4. CSV Export (manual implementation):
const csvContent = 'Name,Email,Message\\n' + data.map(row =>
  \`\${row.submission_data.name || ''},\${row.submission_data.email || ''},\${row.submission_data.message || ''}\`
).join('\\n')
const blob = new Blob([csvContent], { type: 'text/csv' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'submissions.csv'
a.click()

5. Required script tag:
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>

Use 'YOUR_SUPABASE_URL' and 'YOUR_SUPABASE_ANON_KEY' exactly as placeholders.
Replace 'APP_TABLE_ID' with a unique identifier for this app.

Return complete HTML wrapped in \`\`\`html code blocks.`;

/**
 * Mock notification functions to prevent SMS sending during tests
 */
const mockNotifications = {
	async sendSuccessNotification(
		publicUrl: string,
		adminUrl: string | null = null,
		senderPhone: string | null = null,
		emailNeeded: boolean = false
	): Promise<boolean> {
		logWithTimestamp(
			`📱 [MOCK] Success notification would be sent: ${publicUrl}`
		);
		if (adminUrl) {
			logWithTimestamp(`📊 [MOCK] Admin URL would be sent: ${adminUrl}`);
		}
		if (emailNeeded) {
			logWithTimestamp(`✨ [MOCK] Email completion would be requested`);
		}
		return true;
	},

	async sendFailureNotification(
		errorType: string = "generic",
		senderPhone: string | null = null
	): Promise<boolean> {
		logWithTimestamp(
			`❌ [MOCK] Failure notification would be sent: ${errorType}`
		);
		return true;
	},
};

/**
 * Process WTAF request - EXACT copy from controller.ts processWtafRequest function
 * but with mock notifications
 */
async function processWtafRequest(
	userPrompt: string,
	testUserSlug: string = "testuser"
): Promise<{
	success: boolean;
	publicUrl: string | null;
	adminUrl: string | null;
}> {
	logWithTimestamp("🚀 STARTING WTAF PROCESSING WORKFLOW (TEST MODE)");
	logWithTimestamp(`📖 Processing prompt: ${userPrompt}`);

	// Mock file data (normally comes from SMS file parsing)
	const fileData = {
		senderPhone: "+1234567890", // Mock phone number
		userSlug: testUserSlug,
		userPrompt: userPrompt,
	};

	// Mock request info (normally extracted from file processing)
	const requestInfo = {
		coach: null, // Will be extracted from prompt if present
		cleanPrompt: userPrompt,
	};

	try {
		// Determine request configuration based on content type (same logic as controller.ts)
		const isGameRequest =
			userPrompt.toLowerCase().includes("game") ||
			userPrompt.toLowerCase().includes("pong") ||
			userPrompt.toLowerCase().includes("puzzle") ||
			userPrompt.toLowerCase().includes("arcade");

		let configType: keyof typeof REQUEST_CONFIGS;
		if (isGameRequest) {
			configType = "game";
		} else {
			configType = "creation";
		}

		const config = REQUEST_CONFIGS[configType];

		logWithTimestamp(`🎯 Using ${configType} configuration`);
		logWithTimestamp(
			`🤖 Models: Classifier=${config.classifierModel || "N/A"}, Builder=${
				config.builderModel
			}`
		);

		// Step 1: Generate complete prompt with config (EXACT same as controller.ts)
		logWithTimestamp(
			`🔧 Generating complete prompt from: ${userPrompt.slice(0, 50)}...`
		);
		const completePrompt = await generateCompletePrompt(userPrompt, {
			classifierModel: config.classifierModel || "gpt-4o",
			classifierMaxTokens: config.classifierMaxTokens || 600,
			classifierTemperature: config.classifierTemperature || 0.7,
			classifierTopP: config.classifierTopP || 1,
			classifierPresencePenalty: config.classifierPresencePenalty || 0.3,
			classifierFrequencyPenalty: config.classifierFrequencyPenalty || 0,
		});
		logWithTimestamp(
			`🔧 Complete prompt generated: ${
				completePrompt.slice(0, 100) || "None"
			}...`
		);

		let result: string;

		// Check if generateCompletePrompt returned final HTML (ZAD template)
		if (completePrompt.startsWith("```html")) {
			logWithTimestamp(
				"🤝 ZAD template detected - skipping AI builder stage entirely"
			);
			result = completePrompt;
		} else {
			// Step 2: Send complete prompt to Claude with config (EXACT same as controller.ts)
			logWithTimestamp("🚀 PROMPT 2: Sending complete prompt to Claude...");
			logWithTimestamp(
				`🔧 Complete prompt being sent to Claude: ${completePrompt.slice(-300)}`
			);

			result = await callClaude(CREATION_SYSTEM_PROMPT, completePrompt, {
				model: config.builderModel,
				maxTokens: config.builderMaxTokens,
				temperature: config.builderTemperature,
				cookbook: wtafCookbook || undefined,
			});
		}

		// Step 3: Save output to file for debugging (same as controller.ts)
		const outputFile = join(
			CLAUDE_OUTPUT_DIR,
			`test_output_${new Date()
				.toISOString()
				.slice(0, 19)
				.replace(/[:T]/g, "_")}.txt`
		);
		await writeFile(outputFile, result, "utf8");
		logWithTimestamp(`💾 Test output saved to: ${outputFile}`);

		// Step 4: Extract code blocks (same as controller.ts)
		const code = extractCodeBlocks(result);
		if (!code.trim()) {
			logWarning("No code block found.");
			await mockNotifications.sendFailureNotification(
				"no-code",
				fileData.senderPhone
			);
			return { success: false, publicUrl: null, adminUrl: null };
		}

		// Step 5: Deploy the content (EXACT same logic as controller.ts)
		if (fileData.userSlug) {
			logWithTimestamp(
				`🎯 Using Supabase save for user_slug: ${fileData.userSlug}`
			);

			// Check if Claude generated dual pages by looking for the delimiter
			const delimiter = "<!-- WTAF_ADMIN_PAGE_STARTS_HERE -->";
			logWithTimestamp(
				`🔍 Checking for delimiter in code (length: ${code.length} chars)`
			);

			let isDualPage = false;
			let publicUrl: string | null = null;
			let adminUrl: string | null = null;

			if (code.includes(delimiter)) {
				logWithTimestamp(`📊 Dual-page app detected - deploying both pages`);

				// Split HTML on the delimiter
				const [publicHtml, adminHtml] = code.split(delimiter, 2);
				logWithTimestamp(
					`✂️ Split HTML into public (${publicHtml.length} chars) and admin (${adminHtml.length} chars) pages`
				);

				// Deploy public page (normal app)
				const publicResult = await saveCodeToSupabase(
					publicHtml.trim(),
					requestInfo.coach || "test-coach",
					fileData.userSlug,
					fileData.senderPhone,
					userPrompt
				);

				if (publicResult.appSlug && publicResult.publicUrl) {
					publicUrl = publicResult.publicUrl;

					// Deploy admin page with admin prefix
					const adminResult = await saveCodeToSupabase(
						adminHtml.trim(),
						requestInfo.coach || "test-coach",
						fileData.userSlug,
						fileData.senderPhone,
						`Admin dashboard for ${userPrompt}`,
						publicResult.appSlug
					);

					if (adminResult.publicUrl) {
						adminUrl = adminResult.publicUrl;
						isDualPage = true;
					}
				}
			} else {
				// Single page deployment
				logWithTimestamp(`📱 Single-page app - deploying one page`);
				const result = await saveCodeToSupabase(
					code,
					requestInfo.coach || "test-coach",
					fileData.userSlug,
					fileData.senderPhone,
					userPrompt
				);
				publicUrl = result.publicUrl;
			}

			// Generate OG image and update HTML BEFORE sending notifications (same as controller.ts)
			if (publicUrl) {
				try {
					// Extract app slug from URL for OG generation
					const urlParts = publicUrl.split("/");
					const appSlug = urlParts[urlParts.length - 1];

					logWithTimestamp(
						`🖼️ Generating OG image for: ${fileData.userSlug}/${appSlug}`
					);
					const actualImageUrl = await generateOGImage(
						fileData.userSlug,
						appSlug
					);

					if (actualImageUrl) {
						logSuccess(`✅ Generated OG image: ${actualImageUrl}`);
						const updateSuccess = await updateOGImageInHTML(
							fileData.userSlug,
							appSlug,
							actualImageUrl
						);
						if (updateSuccess) {
							logSuccess(`✅ Updated HTML with correct OG image URL`);
						} else {
							logWarning(`⚠️ Failed to update HTML with OG image URL`);
						}
					} else {
						logWarning(`⚠️ OG generation failed, keeping fallback URL`);
					}
				} catch (error) {
					logWarning(
						`OG generation failed: ${
							error instanceof Error ? error.message : String(error)
						}`
					);
				}

				// Check if page needs email completion
				const needsEmail = code.includes("[CONTACT_EMAIL]");
				await mockNotifications.sendSuccessNotification(
					publicUrl,
					adminUrl,
					fileData.senderPhone,
					needsEmail
				);

				logWithTimestamp("=" + "=".repeat(79));
				logWithTimestamp("🎉 WTAF PROCESSING COMPLETE (TEST MODE)!");
				logWithTimestamp(`🌐 Final URL: ${publicUrl}`);
				if (adminUrl) {
					logWithTimestamp(`📊 Admin URL: ${adminUrl}`);
				}
				logWithTimestamp("=" + "=".repeat(79));

				return { success: true, publicUrl, adminUrl };
			} else {
				logError("Failed to save content");
				await mockNotifications.sendFailureNotification(
					"database",
					fileData.senderPhone
				);
				return { success: false, publicUrl: null, adminUrl: null };
			}
		} else {
			logError("No user slug provided for test");
			return { success: false, publicUrl: null, adminUrl: null };
		}
	} catch (error) {
		logError(
			`WTAF processing error: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
		await mockNotifications.sendFailureNotification(
			"generic",
			fileData.senderPhone
		);
		return { success: false, publicUrl: null, adminUrl: null };
	}
}

/**
 * Save test result to file
 */
async function saveTestResult(
	prompt: string,
	publicUrl: string | null,
	adminUrl: string | null = null
): Promise<void> {
	const resultsFile = join(__dirname, "test-results.txt");
	const timestamp = new Date().toISOString();

	let resultLine = `"${prompt}": ${publicUrl || "FAILED"}`;
	if (adminUrl) {
		resultLine += ` (Admin: ${adminUrl})`;
	}
	resultLine += ` - ${timestamp}\n`;

	try {
		if (existsSync(resultsFile)) {
			await appendFile(resultsFile, resultLine);
		} else {
			await writeFile(
				resultsFile,
				`WTAF Test Results\n=================\n\n${resultLine}`
			);
		}
		logSuccess(`✅ Test result saved to: ${resultsFile}`);
	} catch (error) {
		logError(
			`Error saving test result: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
	}
}

/**
 * Main test function
 */
async function runTest(userPrompt: string): Promise<void> {
	logWithTimestamp("=" + "=".repeat(79));
	logWithTimestamp("🧪 WTAF PRODUCTION TEST SCRIPT STARTING");
	logWithTimestamp(`📥 Input prompt: "${userPrompt}"`);
	logWithTimestamp("=" + "=".repeat(79));

	try {
		// Initialize like the controller does
		wtafCookbook = await loadWtafCookbook();
		if (wtafCookbook) {
			logSuccess("📖 WTAF Cookbook loaded and ready for testing");
		} else {
			logWarning(
				"⚠️ WTAF Cookbook failed to load - proceeding without brand guidelines"
			);
		}

		// Create required directories (same as controller.ts)
		try {
			await createRequiredDirectories(
				PROCESSED_DIR,
				CLAUDE_OUTPUT_DIR,
				WEB_OUTPUT_DIR,
				WATCH_DIRS
			);
		} catch (error) {
			logError(
				`Failed to create directories: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
			process.exit(1);
		}

		// Use a generic test user slug (same for all tests)
		const testUserSlug = "test-user";

		// Ensure the generic test user exists in the database
		await ensureTestUser(testUserSlug);

		// Process the request using EXACT production logic
		const result = await processWtafRequest(userPrompt, testUserSlug);

		// Save result
		await saveTestResult(userPrompt, result.publicUrl, result.adminUrl);

		if (result.success) {
			console.log("\n" + "=".repeat(80));
			console.log("🎉 TEST COMPLETED SUCCESSFULLY!");
			console.log(`🌐 Public URL: ${result.publicUrl}`);
			if (result.adminUrl) {
				console.log(`📊 Admin URL: ${result.adminUrl}`);
			}
			console.log("=".repeat(80));
		} else {
			console.log("\n" + "=".repeat(80));
			console.log("❌ TEST FAILED");
			console.log("Check logs above for details");
			console.log("=".repeat(80));
			process.exit(1);
		}
	} catch (error) {
		logError(
			`Test error: ${error instanceof Error ? error.message : String(error)}`
		);
		await saveTestResult(userPrompt, null);
		process.exit(1);
	}
}

// Command line interface
const args = process.argv.slice(2);
if (args.length === 0) {
	console.log("\n🧪 WTAF Production Test Script");
	console.log("=============================");
	console.log(
		"\nThis script bypasses SMS but runs EXACTLY like production would."
	);
	console.log(
		"It uses the same pipeline: classifier → processor → storage → OG generation"
	);
	console.log("\nUsage:");
	console.log('  npm run test:wtaf "wtaf create a tetris game for me"');
	console.log('  npm run test:wtaf "wtaf build a contact form"');
	console.log('  npm run test:wtaf "wtaf -alex- make a productivity tracker"');
	console.log("\nResults are saved to test-results.txt with format:");
	console.log('"[PROMPT]": [URL] - [TIMESTAMP]');
	console.log("");
	process.exit(1);
}

const userPrompt = args.join(" ");
runTest(userPrompt).catch((error) => {
	console.error("Fatal test error:", error);
	process.exit(1);
});
