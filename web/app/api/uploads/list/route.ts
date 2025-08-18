import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userSlug = searchParams.get('userSlug');

		if (!userSlug) {
			return NextResponse.json(
				{ error: 'User slug is required' },
				{ status: 400 }
			);
		}

		// Fetch user's uploads
		const { data: uploads, error } = await supabase
			.from('wtaf_user_uploads')
			.select('*')
			.eq('user_slug', userSlug)
			.eq('status', 'active')
			.order('upload_number', { ascending: true });

		if (error) {
			console.error('Database query error:', error);
			return NextResponse.json(
				{ error: 'Failed to fetch uploads' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			uploads: uploads || [],
			count: uploads?.length || 0
		});

	} catch (error) {
		console.error('List error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}