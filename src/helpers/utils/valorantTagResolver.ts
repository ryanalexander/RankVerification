import { createCanvas, loadImage } from 'canvas';

import vision from '@google-cloud/vision';

export default async function resolveTag(img: Buffer) {
	const client = new vision.ImageAnnotatorClient({
		credentials: {
			private_key:
				'-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC+7S/htSwjvDP6\nKvBArLlGAzLAVt/UIryw0RMAr79Ej/OoWj1g/lxB0Lwo10qZtloAe3wahd6R26mQ\nMYAMPzpYfisHN+2Iz37jdmDp2+XN2/6sCW/HjChD7YZ1YPuZRsDjDdbbSPqNkHvR\niavrinQw/3zXoLqEPbhfkcdfQMsPPIxsbQ3pQo29cMItrvBtCr3tvkUycC8e0QkI\nwlbzLe6jMw0thg+pnN0jJml9PDB7xXe0sI8E7d5iJXhgExHL7dGnsmZvRvYmmh33\nKsviveY5wSXwC4PUfuGE34I0McqAy9UmSV6BGubIq3TGgxwyROACBF3CpY1+LNBe\n3JsvSP7nAgMBAAECggEAMXtVUoDa3LQVIHvqYkihh9SiXZjmT5tlHcpBy4bA4msQ\ncgxZJf8mN+R6L3eEnQvWjZNzWYhiY5jzfCxoDESCwZaJXkiPZkqojxkKCvHzwAOJ\nIFsdvjDD6r7vfxJQgqwEp5PZoGFsli3g+TBd/yCV9nDwkQ3V6Rn548LrUfN/7QWH\ntwuF2dSNrj+Neo7ZhbVQ1KmVHQndn3iZw/AiL6d+gu9Yc3oBPxrcZbgfNa0tKluM\nINb9PkcnHgfqWVqSrIoOtdAxcYsIPRpsxctacjVgZICXbNzIUVHCcMEDlno47JQJ\npoS4pUIaqBIXue9FRskCaA5UcqaErD5ggS5iIT85wQKBgQD67/JhZG3j0LuG6ZHo\nB0yurVJY5zPmCjQtnNvjJEhQMv7IuEyLYmio/hQLxQHOfaRVWYlooeRp/7QyBG8V\n2xI7HXAIAeS8qldQ9xKaYbdqceXLJgj3gMiHUj6UJb0sj0nPlLbnv5mh3rGqb1C5\nZF/KnRIiSChZm9YyQ78pd+rEhwKBgQDCx0srC0SYwq7ve1Us3RIjif9YyerAGZkl\nU7nd/pcHxVlHWrxv9ZJaBwKWLs9IXK5h//MigmGHuCRfAww80xwEghtQKG/HFgBs\nzokUd3ULJgcYVEsl2aCAWkbLIH/uGZXStPiPWpiluDYcsbwv64HcY/xO2LC6uRHz\n6w08qwDqoQKBgFhkHv+5bY/63aOHMNMHhzZcbQ5N2pUkcP7EKxxWknZVkDPJ34SV\nlII6hXsj2SAQV8uMr39Az4GbBbE8qJiNQ125X9YiPJ1Mb1dgwJfK5d3D4wrtCemM\n3pX0HYD3ziwdCQXqv4bgkdBX7kM31LqJJcjsDRAwVK5D2253OKX1zKePAoGAAhtv\n175edpyckeCusjaODK5ggdBlZsCgJIQ8XYd0kNP0vE3h/gAVHj43K/LDsU+3Xz4K\nnlP0xCgc1J5O0pWiFvZlXz+gvfGh/Ytadks4i+9UYlH/IiCxmNHhNC9c0vGZ6lak\n3cAoKJrOkw7lL0uH8x9tyliTyOFZrV7cnMxozSECgYBn2RDyZ2ivUETQ5CkYF4Wq\nT1LGel3y4w4QKMkzkl8zAecTcLDaUeAQUXObFSOYFFqYXB/ABaZjet3wKeFWid03\nMoO37mppmeOw0sF3tUlw0lqP4DEd3KZEnZChxWOLpheDesFY8SKIlGqCy5Am204N\nbjGd2QQQSslf5WKg9Gc3Tw==\n-----END PRIVATE KEY-----\n',
			client_email: 'rankverification@stelch.iam.gserviceaccount.com'
		}
	});
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

	const parts = (
		await client.annotateImage({
			image: {
				content: filteredCanvas.toBuffer().toString('base64')
			},
			features: [{ type: 'TEXT_DETECTION' }]
		})
	)[0].fullTextAnnotation;

	if (!parts || !parts.text) return { success: false, error: true, message: 'Initial scan found no text' };

	console.log(`Result is ${parts.text}`);

	const text = parts.text.split('\n')[0].split(' #');

	return { success: true, parts: text };

	/*
	const {
		data: { text }
	} = await Tesseract.recognize(filteredCanvas.toDataURL(), 'eng');
	const parts = text.replace('#', '').split('\n')[0].split(' ');
	if (parts.length < 2) {
		return { success: false, error: true, message: 'Final call returned no results' };
	}
	
	return { success: true, parts };
	*/

	function getDifference(a: number, b: number) {
		return Math.abs(a - b);
	}

	function matchingRGB(first: any, second: any) {
		return first[0] === second[0] && first[1] === second[1] && first[2] === second[2];
	}
}
