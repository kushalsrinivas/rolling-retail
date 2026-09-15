/**
 * Watermarking concept renders on the way out.
 *
 * Food Truck Factory asked for this: a buyer who takes a concept to another
 * builder should be carrying the factory's mark with it. It is a deterrent,
 * not DRM — anyone can still screenshot — so it is applied where it matters
 * (the file the buyer saves) and kept legible rather than obtrusive.
 */

export interface WatermarkOptions {
	/** Corner mark, e.g. the factory's name. */
	text: string;
	/** Second line under it — concept view, date. */
	subtext?: string;
	/** Draw a tiled diagonal wash across the whole image as well. */
	tile?: boolean;
}

function loadImage(src: string) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("could not read the render"));
		img.src = src;
	});
}

/**
 * Returns a PNG data URL with the mark burned in. On any failure the original
 * URL comes back unchanged — a buyer losing their download is worse than a
 * buyer getting one without a watermark.
 */
export async function watermarkImage(
	dataUrl: string,
	options: WatermarkOptions,
): Promise<string> {
	try {
		const img = await loadImage(dataUrl);
		const w = img.naturalWidth || img.width;
		const h = img.naturalHeight || img.height;
		if (!w || !h) return dataUrl;

		const canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext("2d");
		if (!ctx) return dataUrl;

		ctx.drawImage(img, 0, 0, w, h);

		// Scale with the image so the mark reads the same on every view.
		const unit = Math.max(12, Math.round(Math.min(w, h) * 0.028));

		if (options.tile) {
			ctx.save();
			ctx.globalAlpha = 0.07;
			ctx.fillStyle = "#ffffff";
			ctx.font = `600 ${unit}px ui-sans-serif, system-ui, sans-serif`;
			ctx.rotate(-Math.PI / 9);
			const step = unit * 12;
			for (let y = -h; y < h * 2; y += step) {
				for (let x = -w; x < w * 2; x += step) {
					ctx.fillText(options.text, x, y);
				}
			}
			ctx.restore();
		}

		// Corner plate, so the mark stays readable over a bright render.
		const pad = unit * 0.7;
		ctx.font = `700 ${unit}px ui-sans-serif, system-ui, sans-serif`;
		const textW = ctx.measureText(options.text).width;
		let subW = 0;
		if (options.subtext) {
			ctx.font = `500 ${unit * 0.72}px ui-sans-serif, system-ui, sans-serif`;
			subW = ctx.measureText(options.subtext).width;
		}
		const plateW = Math.max(textW, subW) + pad * 2;
		const plateH = options.subtext ? unit * 2.5 + pad : unit * 1.4 + pad;
		const plateX = w - plateW - unit * 0.8;
		const plateY = h - plateH - unit * 0.8;

		ctx.globalAlpha = 0.55;
		ctx.fillStyle = "#000000";
		ctx.beginPath();
		ctx.roundRect(plateX, plateY, plateW, plateH, unit * 0.35);
		ctx.fill();

		ctx.globalAlpha = 0.95;
		ctx.fillStyle = "#ffffff";
		ctx.font = `700 ${unit}px ui-sans-serif, system-ui, sans-serif`;
		ctx.fillText(options.text, plateX + pad, plateY + pad + unit * 0.75);
		if (options.subtext) {
			ctx.globalAlpha = 0.7;
			ctx.font = `500 ${unit * 0.72}px ui-sans-serif, system-ui, sans-serif`;
			ctx.fillText(options.subtext, plateX + pad, plateY + pad + unit * 1.85);
		}

		return canvas.toDataURL("image/png");
	} catch (err) {
		console.warn("[watermark] falling back to the original render:", err);
		return dataUrl;
	}
}

/** Save a data URL to the buyer's device. */
export function downloadDataUrl(dataUrl: string, filename: string) {
	const a = document.createElement("a");
	a.href = dataUrl;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
}
