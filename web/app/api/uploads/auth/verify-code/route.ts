import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_KEY!
);

const JWT_SECRET = process.env.UPLOAD_AUTH_JWT_SECRET || 'your-upload-auth-secret-change-in-production';

export async function POST(request: NextRequest) {
	try {
		const { userSlug, code } = await request.json();

		if (!userSlug || !code) {
			return NextResponse.json(
				{ error: 'User slug and code are required' },
				{ status: 400 }
			);
		}

		// Find valid, unused code
		const { data: authCode, error: codeError } = await supabase
			.from('wtaf_upload_auth_codes')
			.select('*')
			.eq('user_slug', userSlug)
			.eq('code', code)
			.eq('used', false)
			.gt('expires_at', new Date().toISOString())
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		if (codeError || !authCode) {
			return NextResponse.json(
				{ error: 'Invalid or expired code' },
				{ status: 401 }
			);
		}

		// Mark code as used
		const { error: updateError } = await supabase
			.from('wtaf_upload_auth_codes')
			.update({ used: true, used_at: new Date().toISOString() })
			.eq('id', authCode.id);

		if (updateError) {
			console.error('Error marking code as used:', updateError);
		}

		// Generate JWT token for uploads access (valid for 1 hour)
		const token = jwt.sign(
			{ 
				userSlug, 
				userId: authCode.user_id,
				purpose: 'uploads_access',
				exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
			},
			JWT_SECRET
		);

		return NextResponse.json({
			success: true,
			token,
			message: 'Code verified successfully',
			expiresIn: 3600 // 1 hour in seconds
		});

	} catch (error) {
		console.error('Verify code error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}