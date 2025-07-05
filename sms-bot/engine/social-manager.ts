import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from './shared/config.js';
import { logWithTimestamp, logSuccess, logError, logWarning } from './shared/logger.js';

// Lazy initialization of Supabase client
let supabase: SupabaseClient | null = null;
function getSupabaseClient(): SupabaseClient {
    if (!supabase) {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required");
        }
        supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    }
    return supabase;
}

/**
 * Calculate the correct generation level for a remix
 * If parent is original (not a remix): generation = 1
 * If parent is a remix: generation = parent's generation + 1
 */
async function calculateGenerationLevel(parentAppId: string): Promise<number> {
    try {
        // Check if the parent app is itself a remix
        const { data: parentRemixData, error } = await getSupabaseClient()
            .from('wtaf_remix_lineage')
            .select('generation_level')
            .eq('child_app_id', parentAppId)
            .single();

        if (error || !parentRemixData) {
            // Parent app is NOT a remix (it's an original), so this remix is generation 1
            logWithTimestamp(`📊 Parent is original app → Generation 1`);
            return 1;
        }

        // Parent IS a remix, so add 1 to its generation level
        const newGeneration = parentRemixData.generation_level + 1;
        logWithTimestamp(`📊 Parent is generation ${parentRemixData.generation_level} → New generation: ${newGeneration}`);
        return newGeneration;

    } catch (error) {
        logError(`Error calculating generation level: ${error instanceof Error ? error.message : String(error)}`);
        return 1; // Fallback to generation 1
    }
}

/**
 * Handle all social database updates when an app is remixed
 * 1. Increment remix count on original app
 * 2. Create remix lineage entry
 * 3. Auto-follow original creator
 * 4. Update user social stats
 */
export async function handleRemixSocialUpdates(
    originalAppSlug: string,
    originalUserSlug: string,
    newAppId: string,
    remixUserSlug: string,
    remixPrompt: string
): Promise<boolean> {
    try {
        logWithTimestamp(`🔗 Starting social updates for remix: ${originalUserSlug}/${originalAppSlug} → ${remixUserSlug}`);

        // 1. Get the original app's UUID and increment remix count
        const { data: originalApp, error: originalAppError } = await getSupabaseClient()
            .from('wtaf_content')
            .select('id, remix_count')
            .eq('app_slug', originalAppSlug)
            .eq('user_slug', originalUserSlug)
            .eq('status', 'published')
            .single();

        if (originalAppError || !originalApp) {
            logError(`Failed to find original app: ${originalUserSlug}/${originalAppSlug}`);
            return false;
        }

        const originalAppId = originalApp.id;
        const currentRemixCount = originalApp.remix_count || 0;

        // Increment remix count and update last_remixed_at
        const { error: incrementError } = await getSupabaseClient()
            .from('wtaf_content')
            .update({ 
                remix_count: currentRemixCount + 1,
                last_remixed_at: new Date().toISOString()
            })
            .eq('id', originalAppId);

        if (incrementError) {
            logError(`Failed to increment remix count: ${incrementError.message}`);
            return false;
        }

        logSuccess(`✅ Incremented remix count: ${currentRemixCount} → ${currentRemixCount + 1}`);

        // 2. Calculate correct generation level
        const generationLevel = await calculateGenerationLevel(originalAppId);
        logWithTimestamp(`🧬 Calculated generation level: ${generationLevel}`);

        // 3. Create remix lineage entry with correct generation
        const { error: lineageError } = await getSupabaseClient()
            .from('wtaf_remix_lineage')
            .insert({
                child_app_id: newAppId,
                parent_app_id: originalAppId,
                child_user_slug: remixUserSlug,
                parent_user_slug: originalUserSlug,
                remix_prompt: remixPrompt,
                generation_level: generationLevel
            });

        if (lineageError) {
            logError(`Failed to create remix lineage: ${lineageError.message}`);
            // Don't return false - this is not critical
        } else {
            logSuccess(`✅ Created remix lineage entry (Generation ${generationLevel})`);
        }

        // 4. Auto-follow the original creator (if not already following)
        if (originalUserSlug !== remixUserSlug) {
            const { error: followError } = await getSupabaseClient()
                .from('wtaf_social_connections')
                .insert({
                    follower_user_slug: remixUserSlug,
                    following_user_slug: originalUserSlug,
                    connection_type: 'follow',
                    source_app_slug: originalAppSlug
                })
                .select()
                // Use upsert to avoid duplicate key errors
                .single();

            if (followError && followError.code !== '23505') { // 23505 is unique constraint violation
                logWarning(`Auto-follow failed: ${followError.message}`);
            } else if (followError?.code === '23505') {
                logWithTimestamp(`📝 User ${remixUserSlug} already follows ${originalUserSlug}`);
            } else {
                logSuccess(`✅ Auto-follow created: ${remixUserSlug} → ${originalUserSlug}`);
            }
        }

        // 5. Update user social stats (simple increment approach)
        const { data: currentUser, error: getUserError } = await getSupabaseClient()
            .from('sms_subscribers')
            .select('total_remix_credits')
            .eq('slug', originalUserSlug)
            .single();

        if (!getUserError && currentUser) {
            const currentCredits = currentUser.total_remix_credits || 0;
            const { error: updateError } = await getSupabaseClient()
                .from('sms_subscribers')
                .update({ total_remix_credits: currentCredits + 1 })
                .eq('slug', originalUserSlug);

            if (updateError) {
                logWarning(`Failed to update social stats: ${updateError.message}`);
            } else {
                logSuccess(`✅ Updated social stats for ${originalUserSlug}: ${currentCredits + 1} remix credits`);
            }
        } else {
            logWarning(`Could not find user ${originalUserSlug} for social stats update`);
        }

        // 6. Mark the new app as a remix
        const { error: markRemixError } = await getSupabaseClient()
            .from('wtaf_content')
            .update({ 
                is_remix: true,
                parent_app_id: originalAppId
            })
            .eq('id', newAppId);

        if (markRemixError) {
            logWarning(`Failed to mark new app as remix: ${markRemixError.message}`);
        } else {
            logSuccess(`✅ Marked new app as remix of ${originalAppSlug}`);
        }

        logSuccess(`🎉 All social updates completed for remix!`);
        return true;

    } catch (error) {
        logError(`Social updates failed: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

/**
 * Get app info needed for social updates (app ID and user slug)
 */
export async function getAppInfoForRemix(appSlug: string): Promise<{ id: string, userSlug: string } | null> {
    try {
        const { data, error } = await getSupabaseClient()
            .from('wtaf_content')
            .select('id, user_slug')
            .eq('app_slug', appSlug)
            .eq('status', 'published')
            .single();

        if (error || !data) {
            logError(`Failed to get app info for ${appSlug}: ${error?.message || 'Not found'}`);
            return null;
        }

        return { id: data.id, userSlug: data.user_slug };

    } catch (error) {
        logError(`Error getting app info: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
} 