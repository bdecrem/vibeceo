import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_KEY!
);

export async function DELETE(request: NextRequest) {
	try {
		const { imageId, userSlug } = await request.json();

		if (!imageId || !userSlug) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 }
			);
		}

		// Get the image record to verify ownership and get file path
		const { data: imageData, error: fetchError } = await supabase
			.from('wtaf_user_uploads')
			.select('*')
			.eq('id', imageId)
			.eq('user_slug', userSlug)
			.single();

		if (fetchError || !imageData) {
			return NextResponse.json(
				{ error: 'Image not found or access denied' },
				{ status: 404 }
			);
		}

		// Soft delete - update status to 'deleted'
		const { error: updateError } = await supabase
			.from('wtaf_user_uploads')
			.update({ status: 'deleted', updated_at: new Date().toISOString() })
			.eq('id', imageId);

		if (updateError) {
			console.error('Database update error:', updateError);
			return NextResponse.json(
				{ error: 'Failed to delete image record' },
				{ status: 500 }
			);
		}

		// Also delete from storage
		const { error: storageError } = await supabase.storage
			.from('user-uploads')
			.remove([imageData.file_path]);

		if (storageError) {
			console.error('Storage deletion error:', storageError);
			// Don't fail the request if storage deletion fails
			// The database record is already marked as deleted
		}

		return NextResponse.json({
			success: true,
			message: 'Image deleted successfully'
		});

	} catch (error) {
		console.error('Delete error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}