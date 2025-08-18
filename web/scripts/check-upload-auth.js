// Quick debug script to check upload auth system
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL,
	process.env.SUPABASE_SERVICE_KEY
);

async function checkUploadAuthSystem() {
	console.log('🔍 Checking upload authentication system...\n');

	// 1. Check if auth codes table exists
	try {
		const { data, error } = await supabase
			.from('wtaf_upload_auth_codes')
			.select('count')
			.limit(1);
		
		if (error) {
			console.log('❌ Auth codes table does not exist:', error.message);
			console.log('💡 Run: psql <db_url> -f sms-bot/migrations/create_upload_auth_codes_table.sql\n');
		} else {
			console.log('✅ Auth codes table exists\n');
		}
	} catch (err) {
		console.log('❌ Database connection failed:', err.message, '\n');
	}

	// 2. Check user role (replace 'bart' with actual user slug)
	const userSlug = 'bart';
	try {
		const { data: userData, error: userError } = await supabase
			.from('sms_subscribers')
			.select('id, slug, role, phone_number')
			.eq('slug', userSlug)
			.single();

		if (userError || !userData) {
			console.log(`❌ User '${userSlug}' not found`);
		} else {
			console.log(`✅ User found: ${userData.slug}`);
			console.log(`📱 Phone: ${userData.phone_number}`);
			console.log(`👤 Role: ${userData.role}`);
			
			const allowedRoles = ['degen', 'admin', 'operator'];
			if (allowedRoles.includes(userData.role)) {
				console.log('✅ User has upload access\n');
			} else {
				console.log('❌ User needs DEGEN+ role for uploads\n');
			}
		}
	} catch (err) {
		console.log('❌ User check failed:', err.message, '\n');
	}

	// 3. Check environment variables
	console.log('🔧 Environment Variables:');
	console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing'}`);
	console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing'}`);
	console.log(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER ? '✅ Set' : '❌ Missing'}`);
	console.log(`UPLOAD_AUTH_JWT_SECRET: ${process.env.UPLOAD_AUTH_JWT_SECRET ? '✅ Set' : '❌ Missing (using default)'}`);
}

checkUploadAuthSystem().catch(console.error);