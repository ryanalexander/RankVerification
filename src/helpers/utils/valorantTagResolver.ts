import { createCanvas, loadImage } from 'canvas';
import Tesseract from 'tesseract.js';
import { default as fs } from 'fs';

export default async function resolveTag(img: Buffer) {
	const image = await loadImage(img);
	let startingColour = [999, 999, 999];
	let calibrationColour = [0, 0, 0];
	let hueChanged = false;

	const canvas = createCanvas(image.width, image.height);
	const ctx = canvas.getContext('2d');
	ctx.drawImage(image, 0, 0);

	let postY = 0;

	let firstX = 0;
	let firstY = 0;

	let lastX = 0;
	let lastY = 0;

	let stopSearch = false;

	const sidebarPixel = ctx.getImageData(image.width - 2, image.height - 50, 1, 1).data;

	const sidebarOpen =
		getDifference(sidebarPixel[0], 47) < getDifference(sidebarPixel[0], 69) &&
		getDifference(sidebarPixel[1], 55) < getDifference(sidebarPixel[1], 79) &&
		getDifference(sidebarPixel[2], 64) < getDifference(sidebarPixel[2], 89);

	if (sidebarOpen) {
		const calibrationPixel = ctx.getImageData(image.width - 300, image.height / 8 + 5, 1, 1).data;
		calibrationColour = [calibrationPixel[0], calibrationPixel[1], calibrationPixel[2]];
	} else {
		const calibrationPixel = ctx.getImageData(image.width - 100, image.height / 8 + 5, 1, 1).data;
		calibrationColour = [calibrationPixel[0], calibrationPixel[1], calibrationPixel[2]];
	}
	for (let x = image.width / 2; x < image.width && !stopSearch; x++) {
		for (let y = 0; y < image.height / 3 && !stopSearch; y++) {
			const pixel = ctx.getImageData(x, y, 1, 1).data;
			if (!hueChanged) {
				if (
					getDifference(pixel[0], calibrationColour[0]) < 1 &&
					getDifference(pixel[1], calibrationColour[1]) < 1 &&
					getDifference(pixel[2], calibrationColour[2]) < 1
				) {
					const calibrationValue = ctx.getImageData(x + 5, y - 30, 1, 1).data;
					startingColour = [calibrationValue[0], calibrationValue[1], calibrationValue[2]];
					hueChanged = true;
				}
			}

			if (matchingRGB(pixel, [15, 25, 47]) && postY === 0) postY = y;

			if (postY > 0 && y < postY) continue;

			if (
				getDifference(pixel[0], startingColour[0]) < 2 &&
				getDifference(pixel[1], startingColour[1]) < 2 &&
				getDifference(pixel[2], startingColour[2]) < 2
			) {
				if (firstX === 0 && firstY === 0) {
					firstX = x;
					firstY = y;
					lastX = x;
					lastY = y;
				}
				lastX = x;
				lastY = y;

				if (getDifference(y, lastY) > 50) {
					stopSearch = true;
				}
			}
		}
	}

	if (firstX === 0 || firstY === 0) {
		return { success: false, error: true, message: 'Unable to locate starting point' };
	}
	if (lastX === 0 || lastY === 0) {
		return { success: false, error: true, message: 'Unable to locate ending point' };
	}

	if (firstX === lastX && firstY === lastY) {
		return { success: false, error: true, message: 'Crop too small' };
	}

	ctx.fillStyle = '#0388fc';

	let boxHeight = lastY - firstY;
	let boxWidth = lastX - firstX;

	boxHeight -= boxHeight / 3;

	const tmpCanvas = createCanvas(boxWidth, boxHeight);
	const tmpCtx = tmpCanvas.getContext('2d');
	tmpCtx.drawImage(image, firstX, firstY, boxWidth, boxHeight, 0, 0, boxWidth, boxHeight);

	let cutX = 0;
	let firstColour = [0, 0, 0];

	for (let x = 5; x < boxWidth && cutX === 0; x++) {
		const pixel = tmpCtx.getImageData(x, 5, 1, 1).data;

		if (pixel[0] === 255 && pixel[1] === 255 && pixel[2] === 255) continue;

		if (x === 5) {
			firstColour = [pixel[0], pixel[1], pixel[2]];
		} else {
			const baseDifference =
				getDifference(pixel[0], firstColour[0]) + getDifference(pixel[1], firstColour[1]) + getDifference(pixel[2], firstColour[2]);

			if (baseDifference > 5) cutX = x;
		}
	}

	if (cutX !== 0) boxWidth = cutX;

	const filteredCanvas = createCanvas(boxWidth, boxHeight);
	const filteredCtx = filteredCanvas.getContext('2d');

	filteredCtx.fillStyle = '#ffffff';
	filteredCtx.fillRect(0, 0, boxWidth, boxHeight);
	filteredCtx.fillStyle = '#000000';

	for (let x = 0; x < boxWidth; x++) {
		for (let y = 0; y < boxHeight; y++) {
			const pixel = tmpCtx.getImageData(x, y, 1, 1).data;
			const fuzz = 35;
			if (
				(getDifference(pixel[0], 35) < fuzz && getDifference(pixel[1], 35) < fuzz && getDifference(pixel[2], 37) < fuzz) ||
				(getDifference(pixel[0], 96) < fuzz * 2 && getDifference(pixel[1], 96) < fuzz * 2 && getDifference(pixel[2], 96) < fuzz * 2)
			) {
				filteredCtx.fillStyle = `#${pixel[0].toString(16)}${pixel[1].toString(16)}${pixel[2].toString(16)}`;
				filteredCtx.fillRect(x, y, 1, 1);
			}
		}
	}

	const name = `./tmp/filtered-${new Date().getTime()}.png`;
	fs.writeFileSync(name, filteredCanvas.toBuffer());

	const {
		data: { text }
	} = await Tesseract.recognize(filteredCanvas.toDataURL(), 'eng');
	const parts = text.replace('#', '').split('\n')[0].split(' ');
	if (parts.length < 2) {
		return { success: false, error: true, message: 'Final call returned no results' };
	}
	return { success: true, parts };

	function getDifference(a: number, b: number) {
		return Math.abs(a - b);
	}

	function matchingRGB(first: any, second: any) {
		return first[0] === second[0] && first[1] === second[1] && first[2] === second[2];
	}
}
