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

		// Find user with valid code
		const { data: userData, error: codeError } = await supabase
			.from('sms_subscribers')
			.select('id, slug, upload_auth_code, upload_auth_expires')
			.eq('slug', userSlug)
			.eq('upload_auth_code', code)
			.gt('upload_auth_expires', new Date().toISOString())
			.single();

		if (codeError || !userData) {
			return NextResponse.json(
				{ error: 'Invalid or expired code' },
				{ status: 401 }
			);
		}

		// Clear the used code
		const { error: clearError } = await supabase
			.from('sms_subscribers')
			.update({ 
				upload_auth_code: null, 
				upload_auth_expires: null 
			})
			.eq('id', userData.id);

		if (clearError) {
			console.error('Error clearing auth code:', clearError);
		}

		// Generate JWT token for uploads access (valid for 1 hour)
		const token = jwt.sign(
			{ 
				userSlug, 
				userId: userData.id,
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