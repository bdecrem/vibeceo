import { supabase } from '../supabase.js';
import { normalizePhoneNumber } from '../subscribers.js';

export interface TwilioMedia {
  url: string;
  contentType: string;
  index: number;
}

export interface StoredMedia {
  id: string;
  uploadNumber: number;
  fileUrl: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Extract media information from Twilio webhook body
 */
export function extractMediaFromWebhook(body: Record<string, any>): TwilioMedia[] {
  const numMedia = parseInt(body.NumMedia) || 0;
  const media: TwilioMedia[] = [];

  for (let i = 0; i < numMedia; i++) {
    const url = body[`MediaUrl${i}`];
    const contentType = body[`MediaContentType${i}`];

    if (url && contentType) {
      media.push({ url, contentType, index: i });
    }
  }

  return media;
}

/**
 * Download media from Twilio URL
 */
async function downloadMedia(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return { buffer, contentType };
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'application/pdf': 'pdf',
  };

  return mimeToExt[mimeType] || 'bin';
}

/**
 * Get file type category from MIME type
 */
function getFileType(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'document';
  return 'other';
}

/**
 * Process and store MMS media from an incoming message
 * Returns array of stored media info
 */
export async function processMmsMedia(
  phoneNumber: string,
  media: TwilioMedia[]
): Promise<StoredMedia[]> {
  if (media.length === 0) return [];

  // Normalize phone number to match database format (+1XXXXXXXXXX)
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  // Get user by phone number
  const { data: userData, error: userError } = await supabase
    .from('sms_subscribers')
    .select('id, slug')
    .eq('phone_number', normalizedPhone)
    .single();

  if (userError || !userData) {
    console.error(`[MMS] User not found for phone ${normalizedPhone} (raw: ${phoneNumber}):`, userError);
    return [];
  }

  const userId = userData.id;
  const userSlug = userData.slug;

  if (!userSlug) {
    console.error(`[MMS] User ${phoneNumber} has no slug, cannot store media`);
    return [];
  }

  const storedMedia: StoredMedia[] = [];

  for (const item of media) {
    try {
      console.log(`[MMS] Downloading media ${item.index + 1}/${media.length}: ${item.contentType}`);

      // Download the media
      const { buffer, contentType } = await downloadMedia(item.url);
      const actualMimeType = contentType.split(';')[0].trim(); // Remove charset etc.

      console.log(`[MMS] Downloaded ${buffer.length} bytes, type: ${actualMimeType}`);

      // Get next upload number for this user
      const { data: uploadCount } = await supabase
        .from('wtaf_user_uploads')
        .select('upload_number')
        .eq('user_slug', userSlug)
        .order('upload_number', { ascending: false })
        .limit(1)
        .single();

      const nextUploadNumber = uploadCount ? uploadCount.upload_number + 1 : 1;

      // Create filename and path
      const ext = getExtensionFromMimeType(actualMimeType);
      const fileName = `${nextUploadNumber}_${Date.now()}.${ext}`;
      const filePath = `user-uploads/${userId}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('og-images')
        .upload(filePath, buffer, {
          contentType: actualMimeType,
          upsert: false
        });

      if (uploadError) {
        console.error(`[MMS] Storage upload error:`, uploadError);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('og-images')
        .getPublicUrl(filePath);

      // Save to database
      const { data: dbData, error: dbError } = await supabase
        .from('wtaf_user_uploads')
        .insert({
          user_id: userId,
          user_slug: userSlug,
          upload_number: nextUploadNumber,
          file_name: `mms_${fileName}`,
          display_name: null,
          file_url: publicUrl,
          file_path: filePath,
          file_type: getFileType(actualMimeType),
          mime_type: actualMimeType,
          file_size: buffer.length,
          width: null,
          height: null,
          status: 'active'
        })
        .select()
        .single();

      if (dbError) {
        console.error(`[MMS] Database insert error:`, dbError);
        // Clean up uploaded file
        await supabase.storage.from('og-images').remove([filePath]);
        continue;
      }

      console.log(`[MMS] Stored media as upload #${nextUploadNumber} for ${userSlug}`);

      storedMedia.push({
        id: dbData.id,
        uploadNumber: nextUploadNumber,
        fileUrl: publicUrl,
        filePath: filePath,
        mimeType: actualMimeType,
        fileSize: buffer.length
      });

    } catch (err) {
      console.error(`[MMS] Error processing media ${item.index}:`, err);
    }
  }

  return storedMedia;
}
