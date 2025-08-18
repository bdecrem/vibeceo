import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const userSlug = formData.get('userSlug') as string;
		const userId = formData.get('userId') as string;
		const displayName = formData.get('displayName') as string | null;

		if (!file || !userSlug || !userId) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 }
			);
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			return NextResponse.json(
				{ error: 'Only image files are allowed' },
				{ status: 400 }
			);
		}

		// Validate file size (5MB)
		if (file.size > 5 * 1024 * 1024) {
			return NextResponse.json(
				{ error: 'File size must be less than 5MB' },
				{ status: 400 }
			);
		}

		// Verify user exists and has proper role
		const { data: userData, error: userError } = await supabase
			.from('sms_subscribers')
			.select('role')
			.eq('id', userId)
			.eq('slug', userSlug)
			.single();

		if (userError || !userData) {
			return NextResponse.json(
				{ error: 'User not found' },
				{ status: 404 }
			);
		}

		// Check role
		const allowedRoles = ['degen', 'admin', 'operator'];
		if (!allowedRoles.includes(userData.role)) {
			return NextResponse.json(
				{ error: 'Insufficient permissions. DEGEN role or higher required.' },
				{ status: 403 }
			);
		}

		// Get next upload number
		const { data: uploadCount } = await supabase
			.from('wtaf_user_uploads')
			.select('upload_number')
			.eq('user_slug', userSlug)
			.order('upload_number', { ascending: false })
			.limit(1)
			.single();

		const nextUploadNumber = uploadCount ? uploadCount.upload_number + 1 : 1;

		// Create unique filename with user-uploads prefix for organization
		const fileExt = file.name.split('.').pop();
		const fileName = `${nextUploadNumber}_${Date.now()}.${fileExt}`;
		const filePath = `user-uploads/${userId}/${fileName}`;

		// Convert File to ArrayBuffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Upload to Supabase Storage (using existing og-images bucket)
		const { data: uploadData, error: uploadError } = await supabase.storage
			.from('og-images')
			.upload(filePath, buffer, {
				contentType: file.type,
				upsert: false
			});

		if (uploadError) {
			console.error('Storage upload error:', uploadError);
			return NextResponse.json(
				{ error: 'Failed to upload file' },
				{ status: 500 }
			);
		}

		// Get public URL
		const { data: { publicUrl } } = supabase.storage
			.from('og-images')
			.getPublicUrl(filePath);

		// Get image dimensions (optional, for images)
		let width = null;
		let height = null;
		
		// Note: In production, you might want to use a library like sharp
		// to get actual image dimensions. For now, we'll leave them null.

		// Save to database
		const { data: dbData, error: dbError } = await supabase
			.from('wtaf_user_uploads')
			.insert({
				user_id: userId,
				user_slug: userSlug,
				upload_number: nextUploadNumber,
				file_name: file.name,
				display_name: displayName,
				file_url: publicUrl,
				file_path: filePath,
				file_type: 'image',
				mime_type: file.type,
				file_size: file.size,
				width: width,
				height: height,
				status: 'active'
			})
			.select()
			.single();

		if (dbError) {
			console.error('Database insert error:', dbError);
			
			// Clean up uploaded file
			await supabase.storage
				.from('og-images')
				.remove([filePath]);

			return NextResponse.json(
				{ error: 'Failed to save upload information' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			uploadNumber: nextUploadNumber,
			fileUrl: publicUrl,
			data: dbData
		});

	} catch (error) {
		console.error('Upload error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}