import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import UploadWidget from '@/components/uploads/upload-widget';
import ImageGallery from '@/components/uploads/image-gallery';
import AuthenticatedUploadsPage from '@/components/uploads/authenticated-uploads-page';

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_KEY!
);

interface PageProps {
	params: Promise<{
		user_slug: string;
	}>;
}

export default async function UserUploadsPage({ params }: PageProps) {
	const { user_slug } = await params;

	// Check if user exists and has DEGEN+ role
	const { data: userData, error: userError } = await supabase
		.from('sms_subscribers')
		.select('id, slug, role')
		.eq('slug', user_slug)
		.single();

	if (userError || !userData) {
		return notFound();
	}

	// Check if user has DEGEN or higher role
	const allowedRoles = ['degen', 'admin', 'operator'];
	if (!allowedRoles.includes(userData.role)) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-8">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-2xl shadow-xl p-8 text-center">
						<h1 className="text-3xl font-bold text-gray-800 mb-4">
							Access Restricted
						</h1>
						<p className="text-gray-600">
							Image uploads are available for DEGEN role and above.
						</p>
						<p className="text-sm text-gray-500 mt-4">
							Keep creating awesome WEBTOYS to unlock this feature!
						</p>
					</div>
				</div>
			</div>
		);
	}

	// Fetch user's existing uploads
	const { data: uploads, error: uploadsError } = await supabase
		.from('wtaf_user_uploads')
		.select('*')
		.eq('user_slug', user_slug)
		.eq('status', 'active')
		.order('upload_number', { ascending: true });

	return (
		<AuthenticatedUploadsPage
			userSlug={user_slug}
			userId={userData.id}
			initialUploads={uploads || []}
		/>
	);
}