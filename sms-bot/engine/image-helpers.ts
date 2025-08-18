import { createClient } from '@supabase/supabase-js';
import { logWithTimestamp, logError, logSuccess, logWarning } from './shared/logger.js';

const supabase = createClient(
	process.env.SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Get a specific user image by number
 */
export async function getUserImage(userSlug: string, imageNumber: number): Promise<string | null> {
	try {
		logWithTimestamp(`🖼️ Fetching image #${imageNumber} for user ${userSlug}`);

		const { data, error } = await supabase
			.from('wtaf_user_uploads')
			.select('file_url, display_name')
			.eq('user_slug', userSlug)
			.eq('upload_number', imageNumber)
			.eq('status', 'active')
			.single();

		if (error || !data) {
			logError(`Image #${imageNumber} not found for user ${userSlug}`);
			return null;
		}

		logSuccess(`✅ Found image #${imageNumber}: ${data.display_name || 'Unnamed'}`);
		return data.file_url;
	} catch (error) {
		logError(`Error fetching user image: ${error}`);
		return null;
	}
}

/**
 * Get all user images
 */
export async function listUserImages(userSlug: string): Promise<Array<{
	number: number;
	url: string;
	name: string | null;
}>> {
	try {
		logWithTimestamp(`📸 Listing all images for user ${userSlug}`);

		const { data, error } = await supabase
			.from('wtaf_user_uploads')
			.select('upload_number, file_url, display_name')
			.eq('user_slug', userSlug)
			.eq('status', 'active')
			.order('upload_number', { ascending: true });

		if (error || !data) {
			logError(`Failed to list images for user ${userSlug}`);
			return [];
		}

		const images = data.map(img => ({
			number: img.upload_number,
			url: img.file_url,
			name: img.display_name
		}));

		logSuccess(`✅ Found ${images.length} images for user ${userSlug}`);
		return images;
	} catch (error) {
		logError(`Error listing user images: ${error}`);
		return [];
	}
}

/**
 * Validate that a user has access to an image
 */
export async function validateImageAccess(userSlug: string, imageNumber: number): Promise<boolean> {
	try {
		const { data, error } = await supabase
			.from('wtaf_user_uploads')
			.select('id')
			.eq('user_slug', userSlug)
			.eq('upload_number', imageNumber)
			.eq('status', 'active')
			.single();

		return !error && !!data;
	} catch (error) {
		logError(`Error validating image access: ${error}`);
		return false;
	}
}

/**
 * Parse image references from user prompt
 * Looks for patterns like "image 3", "image #5", "images 1 and 2", etc.
 */
export function parseImageReferences(prompt: string): number[] {
	const imageNumbers: number[] = [];
	
	// Match various patterns: "image 3", "image #3", "image number 3", etc.
	const patterns = [
		/image\s*#?\s*(\d+)/gi,
		/use\s+image\s*#?\s*(\d+)/gi,
		/add\s+image\s*#?\s*(\d+)/gi,
		/with\s+image\s*#?\s*(\d+)/gi
	];

	for (const pattern of patterns) {
		const matches = prompt.matchAll(pattern);
		for (const match of matches) {
			const num = parseInt(match[1]);
			if (!imageNumbers.includes(num)) {
				imageNumbers.push(num);
			}
		}
	}

	// Also check for ranges like "images 1-3" or "images 1 to 3"
	const rangePattern = /images?\s*#?\s*(\d+)\s*(?:-|to|through)\s*(\d+)/gi;
	const rangeMatches = prompt.matchAll(rangePattern);
	for (const match of rangeMatches) {
		const start = parseInt(match[1]);
		const end = parseInt(match[2]);
		for (let i = start; i <= end && i <= start + 10; i++) { // Limit range to 10 images
			if (!imageNumbers.includes(i)) {
				imageNumbers.push(i);
			}
		}
	}

	// Sort and return
	return imageNumbers.sort((a, b) => a - b);
}

/**
 * Build enhanced prompt with image URLs
 */
export async function enhancePromptWithImages(
	prompt: string, 
	userSlug: string
): Promise<{
	enhancedPrompt: string;
	imageUrls: string[];
	imageReferences: string;
}> {
	const imageNumbers = parseImageReferences(prompt);
	
	if (imageNumbers.length === 0) {
		return {
			enhancedPrompt: prompt,
			imageUrls: [],
			imageReferences: ''
		};
	}

	logWithTimestamp(`🖼️ Found image references in prompt: ${imageNumbers.join(', ')}`);

	const imageUrls: string[] = [];
	const imageDetails: string[] = [];

	for (const num of imageNumbers) {
		const imageUrl = await getUserImage(userSlug, num);
		if (imageUrl) {
			imageUrls.push(imageUrl);
			imageDetails.push(`Image #${num}: ${imageUrl}`);
		} else {
			logError(`⚠️ Image #${num} not found for user ${userSlug}`);
		}
	}

	if (imageUrls.length === 0) {
		return {
			enhancedPrompt: prompt,
			imageUrls: [],
			imageReferences: ''
		};
	}

	const imageReferences = `\n\nUSER'S UPLOADED IMAGES TO INCLUDE:\n${imageDetails.join('\n')}\n\nIMPORTANT: Include these images in the generated content where appropriate.`;

	const enhancedPrompt = prompt + imageReferences;

	return {
		enhancedPrompt,
		imageUrls,
		imageReferences
	};
}

/**
 * Generate upload instructions for responses
 */
export function getUploadInstructions(userSlug: string): string {
	const uploadUrl = `https://webtoys.ai/${userSlug}/uploads`;
	return `To add personal images, upload them at ${uploadUrl} and reference them by number (e.g., "use image 3")`;
}

/**
 * Check if prompt might want images (for suggesting upload)
 */
export function mightWantImages(prompt: string): boolean {
	const imageKeywords = [
		'photo', 'picture', 'image', 'gallery', 'portfolio',
		'birthday', 'wedding', 'party', 'event', 'invitation',
		'personal', 'family', 'memories', 'album'
	];
	
	const lowerPrompt = prompt.toLowerCase();
	return imageKeywords.some(keyword => lowerPrompt.includes(keyword));
}

/**
 * Check if user has DEGEN+ role for uploads
 */
export async function canUserUpload(userSlug: string): Promise<boolean> {
	try {
		const { data, error } = await supabase
			.from('sms_subscribers')
			.select('role')
			.eq('slug', userSlug)
			.single();

		if (error || !data) {
			return false;
		}

		const allowedRoles = ['degen', 'admin', 'operator'];
		return allowedRoles.includes(data.role);
	} catch (error) {
		logError(`Error checking user upload permission: ${error}`);
		return false;
	}
}