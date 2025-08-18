import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import UploadWidget from '@/components/uploads/upload-widget';
import ImageGallery from '@/components/uploads/image-gallery';

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
		<div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4 md:p-8">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="mb-8 text-center">
					<h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
						Your Image Gallery
					</h1>
					<p className="text-gray-600">
						Upload images to use in your WEBTOYS creations
					</p>
					<p className="text-sm text-gray-500 mt-2">
						Reference images in SMS with "use image #1" or "add image #3"
					</p>
				</div>

				{/* Upload Widget */}
				<div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
					<h2 className="text-2xl font-semibold text-gray-800 mb-4">
						Upload New Image
					</h2>
					<UploadWidget 
						userSlug={user_slug} 
						userId={userData.id}
						currentCount={uploads?.length || 0}
					/>
				</div>

				{/* Gallery */}
				<div className="bg-white rounded-2xl shadow-xl p-6">
					<h2 className="text-2xl font-semibold text-gray-800 mb-4">
						Your Images ({uploads?.length || 0})
					</h2>
					{uploads && uploads.length > 0 ? (
						<ImageGallery 
							images={uploads} 
							userSlug={user_slug}
						/>
					) : (
						<div className="text-center py-12 text-gray-500">
							<p className="text-lg mb-2">No images uploaded yet</p>
							<p className="text-sm">Upload your first image above to get started!</p>
						</div>
					)}
				</div>

				{/* Instructions */}
				<div className="mt-8 bg-blue-50 rounded-xl p-6">
					<h3 className="font-semibold text-blue-900 mb-2">How to use your images:</h3>
					<ul className="space-y-2 text-blue-800 text-sm">
						<li>• Upload images here and they'll be numbered automatically</li>
						<li>• In SMS, reference them like: "make a birthday invite with image 3"</li>
						<li>• Or: "create a gallery page using images 1, 2, and 5"</li>
						<li>• Your images are private and only you can use them</li>
					</ul>
				</div>
			</div>
		</div>
	);
}