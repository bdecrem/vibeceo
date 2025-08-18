'use client';

import { useState, useEffect } from 'react';
import UploadAuth from './upload-auth';
import UploadWidget from './upload-widget';
import ImageGallery from './image-gallery';
import { jwtDecode } from 'jwt-decode';

interface AuthenticatedUploadsPageProps {
	userSlug: string;
	userId: string;
	initialUploads: any[];
}

interface ImageData {
	id: string;
	upload_number: number;
	file_name: string;
	display_name: string | null;
	file_url: string;
	file_size: number;
	width: number | null;
	height: number | null;
	created_at: string;
}

export default function AuthenticatedUploadsPage({ 
	userSlug, 
	userId, 
	initialUploads 
}: AuthenticatedUploadsPageProps) {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [authToken, setAuthToken] = useState<string | null>(null);
	const [uploads, setUploads] = useState<ImageData[]>(initialUploads);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Check for existing valid token
		const storedToken = localStorage.getItem(`upload_auth_${userSlug}`);
		if (storedToken) {
			try {
				// Note: In a real app, you'd verify this server-side
				// For now, we'll trust the stored token if it exists
				const decoded = jwtDecode(storedToken) as any;
				if (decoded && decoded.exp && decoded.exp > Date.now() / 1000) {
					setAuthToken(storedToken);
					setIsAuthenticated(true);
				} else {
					localStorage.removeItem(`upload_auth_${userSlug}`);
				}
			} catch (error) {
				localStorage.removeItem(`upload_auth_${userSlug}`);
			}
		}
		setLoading(false);
	}, [userSlug]);

	const handleAuthenticated = (token: string) => {
		setAuthToken(token);
		setIsAuthenticated(true);
	};

	const refreshUploads = async () => {
		try {
			const response = await fetch(`/api/uploads/list?userSlug=${userSlug}`, {
				headers: {
					'Authorization': `Bearer ${authToken}`
				}
			});
			
			if (response.ok) {
				const data = await response.json();
				setUploads(data.uploads || []);
			}
		} catch (error) {
			console.error('Error refreshing uploads:', error);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <UploadAuth userSlug={userSlug} onAuthenticated={handleAuthenticated} />;
	}

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
					
					{/* Logout button */}
					<button
						onClick={() => {
							localStorage.removeItem(`upload_auth_${userSlug}`);
							setIsAuthenticated(false);
							setAuthToken(null);
						}}
						className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
					>
						🔒 Logout from uploads
					</button>
				</div>

				{/* Upload Widget */}
				<div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
					<h2 className="text-2xl font-semibold text-gray-800 mb-4">
						Upload New Image
					</h2>
					<UploadWidget 
						userSlug={userSlug} 
						userId={userId}
						currentCount={uploads.length}
						onUploadSuccess={refreshUploads}
					/>
				</div>

				{/* Gallery */}
				<div className="bg-white rounded-2xl shadow-xl p-6">
					<h2 className="text-2xl font-semibold text-gray-800 mb-4">
						Your Images ({uploads.length})
					</h2>
					{uploads && uploads.length > 0 ? (
						<ImageGallery 
							images={uploads} 
							userSlug={userSlug}
							onDeleteSuccess={refreshUploads}
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
						<li>• Text "UPLOADS" to get a direct secure link to this page</li>
					</ul>
				</div>
			</div>
		</div>
	);
}