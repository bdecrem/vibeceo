'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

interface ImageGalleryProps {
	images: ImageData[];
	userSlug: string;
	onDeleteSuccess?: () => void;
}

export default function ImageGallery({ images, userSlug, onDeleteSuccess }: ImageGalleryProps) {
	const router = useRouter();
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [copiedNumber, setCopiedNumber] = useState<number | null>(null);

	const formatFileSize = (bytes: number) => {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	const copyCommand = (imageNumber: number) => {
		const command = `use image ${imageNumber}`;
		navigator.clipboard.writeText(command);
		setCopiedNumber(imageNumber);
		setTimeout(() => setCopiedNumber(null), 2000);
	};

	const deleteImage = async (imageId: string) => {
		if (!confirm('Are you sure you want to delete this image?')) {
			return;
		}

		setDeletingId(imageId);

		try {
			const response = await fetch('/api/uploads/delete', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ imageId, userSlug }),
			});

			if (!response.ok) {
				throw new Error('Delete failed');
			}

			// Refresh the gallery to update the list
			if (onDeleteSuccess) {
				onDeleteSuccess();
			} else {
				router.refresh();
			}
		} catch (error) {
			console.error('Error deleting image:', error);
			alert('Failed to delete image');
		} finally {
			setDeletingId(null);
		}
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{images.map((image) => (
				<div
					key={image.id}
					className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
				>
					{/* Image Preview */}
					<div className="aspect-square bg-gray-100 relative">
						<img
							src={image.file_url}
							alt={image.display_name || image.file_name}
							className="w-full h-full object-cover"
						/>
						{/* Image Number Badge */}
						<div className="absolute top-2 left-2 bg-purple-600 text-white px-3 py-1 rounded-full text-lg font-bold">
							#{image.upload_number}
						</div>
					</div>

					{/* Image Details */}
					<div className="p-4 space-y-3">
						{/* Name */}
						<div>
							<h3 className="font-semibold text-gray-800">
								{image.display_name || `Image #${image.upload_number}`}
							</h3>
							<p className="text-xs text-gray-500 truncate">
								{image.file_name}
							</p>
						</div>

						{/* Metadata */}
						<div className="text-xs text-gray-600 space-y-1">
							<p>Size: {formatFileSize(image.file_size)}</p>
							{image.width && image.height && (
								<p>Dimensions: {image.width} × {image.height}px</p>
							)}
							<p>Uploaded: {formatDate(image.created_at)}</p>
						</div>

						{/* Actions */}
						<div className="flex gap-2">
							<button
								onClick={() => copyCommand(image.upload_number)}
								className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
							>
								{copiedNumber === image.upload_number ? 'Copied!' : 'Copy SMS Command'}
							</button>
							<button
								onClick={() => deleteImage(image.id)}
								disabled={deletingId === image.id}
								className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50"
							>
								{deletingId === image.id ? '...' : 'Delete'}
							</button>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}