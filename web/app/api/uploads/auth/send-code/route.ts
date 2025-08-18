import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_KEY!
);

// Function to generate 6-digit code
function generateSecurityCode(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
	try {
		const { userSlug } = await request.json();

		if (!userSlug) {
			return NextResponse.json(
				{ error: 'User slug is required' },
				{ status: 400 }
			);
		}

		// Get user data including phone number
		const { data: userData, error: userError } = await supabase
			.from('sms_subscribers')
			.select('id, slug, phone_number, role')
			.eq('slug', userSlug)
			.single();

		if (userError || !userData) {
			return NextResponse.json(
				{ error: 'User not found' },
				{ status: 404 }
			);
		}

		// Check if user has DEGEN+ role
		const allowedRoles = ['degen', 'admin', 'operator'];
		if (!allowedRoles.includes(userData.role)) {
			return NextResponse.json(
				{ error: 'Upload access requires DEGEN role or higher' },
				{ status: 403 }
			);
		}

		// Generate security code
		const securityCode = generateSecurityCode();
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		// Store code in sms_subscribers table
		const { error: updateError } = await supabase
			.from('sms_subscribers')
			.update({
				upload_auth_code: securityCode,
				upload_auth_expires: expiresAt.toISOString()
			})
			.eq('id', userData.id);

		if (updateError) {
			console.error('Error storing auth code:', updateError);
			return NextResponse.json(
				{ error: 'Failed to generate security code' },
				{ status: 500 }
			);
		}

		// Send SMS using Twilio
		const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
		const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
		const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

		if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
			console.error('Twilio credentials not configured');
			return NextResponse.json(
				{ error: 'SMS service not available' },
				{ status: 500 }
			);
		}

		// Format phone number (ensure it has +1)
		let phoneNumber = userData.phone_number;
		if (!phoneNumber.startsWith('+')) {
			phoneNumber = '+1' + phoneNumber.replace(/\D/g, '');
		}

		const messageBody = `Your WEBTOYS upload access code: ${securityCode}\n\nThis code expires in 10 minutes.`;

		// Send SMS via Twilio API
		const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
			method: 'POST',
			headers: {
				'Authorization': `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				From: twilioPhoneNumber,
				To: phoneNumber,
				Body: messageBody,
			}),
		});

		if (!twilioResponse.ok) {
			const twilioError = await twilioResponse.text();
			console.error('Twilio SMS error:', twilioError);
			return NextResponse.json(
				{ error: 'Failed to send SMS' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			message: 'Security code sent via SMS',
			expiresIn: 600 // 10 minutes in seconds
		});

	} catch (error) {
		console.error('Send code error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}