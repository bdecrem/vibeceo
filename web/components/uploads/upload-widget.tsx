'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UploadWidgetProps {
	userSlug: string;
	userId: string;
	currentCount: number;
}

export default function UploadWidget({ userSlug, userId, currentCount }: UploadWidgetProps) {
	const router = useRouter();
	const [file, setFile] = useState<File | null>(null);
	const [displayName, setDisplayName] = useState('');
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [preview, setPreview] = useState<string | null>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (!selectedFile) return;

		// Validate file type
		if (!selectedFile.type.startsWith('image/')) {
			setError('Please select an image file');
			return;
		}

		// Validate file size (5MB limit)
		if (selectedFile.size > 5 * 1024 * 1024) {
			setError('Image must be less than 5MB');
			return;
		}

		setFile(selectedFile);
		setError('');
		
		// Create preview
		const reader = new FileReader();
		reader.onloadend = () => {
			setPreview(reader.result as string);
		};
		reader.readAsDataURL(selectedFile);
	};

	const handleUpload = async () => {
		if (!file) {
			setError('Please select an image');
			return;
		}

		setUploading(true);
		setError('');
		setSuccess('');

		const formData = new FormData();
		formData.append('file', file);
		formData.append('userSlug', userSlug);
		formData.append('userId', userId);
		if (displayName) {
			formData.append('displayName', displayName);
		}

		try {
			const response = await fetch('/api/uploads/upload', {
				method: 'POST',
				body: formData,
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Upload failed');
			}

			setSuccess(`Image uploaded successfully! Reference it as "image ${data.uploadNumber}"`);
			setFile(null);
			setDisplayName('');
			setPreview(null);
			
			// Reset file input
			const fileInput = document.getElementById('file-input') as HTMLInputElement;
			if (fileInput) fileInput.value = '';

			// Refresh the page to show new image
			setTimeout(() => {
				router.refresh();
			}, 2000);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Upload failed');
		} finally {
			setUploading(false);
		}
	};

	return (
		<div className="space-y-4">
			{/* File Input */}
			<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
				<input
					id="file-input"
					type="file"
					accept="image/*"
					onChange={handleFileChange}
					className="hidden"
					disabled={uploading}
				/>
				<label
					htmlFor="file-input"
					className="cursor-pointer"
				>
					{preview ? (
						<div className="space-y-4">
							<img 
								src={preview} 
								alt="Preview" 
								className="max-h-48 mx-auto rounded-lg"
							/>
							<p className="text-sm text-gray-600">Click to change image</p>
						</div>
					) : (
						<div className="space-y-2">
							<svg
								className="mx-auto h-12 w-12 text-gray-400"
								stroke="currentColor"
								fill="none"
								viewBox="0 0 48 48"
								aria-hidden="true"
							>
								<path
									d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
									strokeWidth={2}
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							<p className="text-gray-600">
								Click to upload an image
							</p>
							<p className="text-xs text-gray-500">
								PNG, JPG, GIF up to 5MB
							</p>
						</div>
					)}
				</label>
			</div>

			{/* Display Name Input */}
			<div>
				<label htmlFor="display-name" className="block text-sm font-medium text-gray-700 mb-1">
					Name (optional)
				</label>
				<input
					id="display-name"
					type="text"
					value={displayName}
					onChange={(e) => setDisplayName(e.target.value)}
					placeholder="e.g., Birthday Banner, Logo, Profile Pic"
					className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
					disabled={uploading}
				/>
				<p className="text-xs text-gray-500 mt-1">
					This will be image #{currentCount + 1}
				</p>
			</div>

			{/* Upload Button */}
			<button
				onClick={handleUpload}
				disabled={!file || uploading}
				className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
					!file || uploading
						? 'bg-gray-300 text-gray-500 cursor-not-allowed'
						: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
				}`}
			>
				{uploading ? 'Uploading...' : 'Upload Image'}
			</button>

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
					{error}
				</div>
			)}

			{/* Success Message */}
			{success && (
				<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
					{success}
				</div>
			)}
		</div>
	);
}