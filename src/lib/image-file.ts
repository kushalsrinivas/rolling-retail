/**
 * Read an image the buyer picked into a data URL, downscaled first.
 *
 * Phone cameras produce 4000px JPEGs; the chat endpoint rejects anything over
 * ~12MB and the image model gains nothing from the extra pixels, so everything
 * is capped on the long edge before it leaves the device.
 */
export function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error("Could not read that file."));
		reader.onload = () => {
			const img = new Image();
			img.onerror = () =>
				reject(new Error("That file is not a readable image."));
			img.onload = () => {
				const maxDim = 1536;
				const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
				const canvas = document.createElement("canvas");
				canvas.width = Math.round(img.width * scale);
				canvas.height = Math.round(img.height * scale);
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					reject(new Error("Could not process that image."));
					return;
				}
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				resolve(canvas.toDataURL("image/jpeg", 0.82));
			};
			img.src = String(reader.result);
		};
		reader.readAsDataURL(file);
	});
}
