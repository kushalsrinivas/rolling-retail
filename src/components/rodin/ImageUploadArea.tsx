import { X } from "lucide-react";

interface ImageUploadAreaProps {
	previewUrls: string[];
	onRemoveImage: (index: number) => void;
	isLoading?: boolean;
}

export default function ImageUploadArea({
	previewUrls,
	onRemoveImage,
	isLoading = false,
}: ImageUploadAreaProps) {
	if (previewUrls.length === 0) {
		return null;
	}

	return (
		<div className="pointer-events-auto flex flex-wrap gap-2 px-4 pt-3">
			{previewUrls.map((url, index) => (
				<div key={url} className="relative h-16 w-16">
					<img
						src={url}
						alt={`Preview ${index + 1}`}
						className="h-full w-full rounded-full object-cover"
					/>
					{!isLoading && (
						<button
							type="button"
							onClick={() => onRemoveImage(index)}
							className="absolute -right-1 -top-1"
						>
							<X className="h-3 w-3 text-white" />
						</button>
					)}
				</div>
			))}
		</div>
	);
}
