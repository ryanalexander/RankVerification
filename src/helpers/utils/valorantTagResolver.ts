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

	const targetColour = [28, 33, 39];

	const image = await loadImage(img);
	const canvas = createCanvas(image.width, image.height);
	const ctx = canvas.getContext('2d');
	ctx.drawImage(image, 0, 0);

	// Calibration line either side of midpoint
	let nameZoneBeginY = -1;
	let nameZoneBeginX = -1;

	// Rank Zone
	let rankZoneLeft = -1;
	let rankZoneRight = -1;
	let rankZoneTopY = -1;
	let rankZoneEndY = -1;
	let rankZoneHeight = -1;
	let rankZoneWidth = -1;

	const pixOffset = image.height / image.width;

	let minDiffR = Number.MAX_VALUE;
	let minDiffG = Number.MAX_VALUE;
	let minDiffB = Number.MAX_VALUE;

	// Determine min diff
	for (let i = 0; i < image.width; i++) {
		const x = image.width - i;
		const y = pixOffset * i;

		const pixel = ctx.getImageData(x, y, 1, 1).data;

		const r = pixel[0];
		const g = pixel[1];
		const b = pixel[2];

		const rDiff = getDifference(r, targetColour[0]);
		const gDiff = getDifference(g, targetColour[1]);
		const bDiff = getDifference(b, targetColour[2]);

		if (rDiff < minDiffR) minDiffR = rDiff;

		if (gDiff < minDiffG) minDiffG = gDiff;

		if (bDiff < minDiffB) minDiffB = bDiff;
	}

	// Find target
	for (let i = 0; i < image.width; i++) {
		const x = image.width - i;
		const y = pixOffset * i;

		const pixel = ctx.getImageData(x, y, 1, 1).data;

		const r = pixel[0];
		const g = pixel[1];
		const b = pixel[2];

		const rDiff = getDifference(r, targetColour[0]);
		const gDiff = getDifference(g, targetColour[1]);
		const bDiff = getDifference(b, targetColour[2]);

		if (getDifference(rDiff, minDiffR) < 3 && getDifference(gDiff, minDiffG) < 3 && getDifference(bDiff, minDiffB) < 3) {
			// Found start of bounding box

			rankZoneRight = x;

			let yOffset = 0;
			let xOffset = 0;

			// Find top
			let startPixel = ctx.getImageData(x - 1, y, 1, 1).data;
			let zoneRankTopTmp = y;
			while (y + yOffset > 0) {
				const posX = x - 1;
				const posY = y + yOffset;

				const pixel = ctx.getImageData(posX, posY, 1, 1).data;
				if (
					!(
						getDifference(pixel[0], startPixel[0]) > 3 ||
						getDifference(pixel[1], startPixel[1]) > 3 ||
						getDifference(pixel[2], startPixel[2]) > 3
					)
				) {
					zoneRankTopTmp = y + yOffset;
				}
				yOffset--;
			}
			rankZoneTopY = zoneRankTopTmp;
			yOffset = 0;

			// Find right
			startPixel = ctx.getImageData(x, rankZoneTopY, 1, 1).data;
			while (x + xOffset < image.width) {
				const posX = x + xOffset;
				const posY = rankZoneTopY;

				const pixel = ctx.getImageData(posX, posY, 1, 1).data;
				if (
					!(
						getDifference(pixel[0], startPixel[0]) > 3 ||
						getDifference(pixel[1], startPixel[1]) > 3 ||
						getDifference(pixel[2], startPixel[2]) > 3
					)
				) {
					rankZoneRight = x + xOffset + 1;
				}

				xOffset++;
			}

			// Find bottom
			startPixel = ctx.getImageData(rankZoneRight - 5, rankZoneTopY + 5, 1, 1).data;
			while (rankZoneTopY + yOffset < image.height / 3) {
				const posX = rankZoneRight - 5;
				const posY = rankZoneTopY + yOffset + 5;

				const pixel = ctx.getImageData(posX, posY, 1, 1).data;

				if (
					getDifference(pixel[0], startPixel[0]) > 3 ||
					getDifference(pixel[1], startPixel[1]) > 3 ||
					getDifference(pixel[2], startPixel[2]) > 3
				) {
					rankZoneEndY = posY;
					break;
				}

				yOffset++;
			}
			yOffset = 0;

			// Find left
			startPixel = ctx.getImageData(rankZoneRight - 1, rankZoneTopY + 1, 1, 1).data;
			while (rankZoneRight - 1 + xOffset > image.width / 2) {
				const posX = rankZoneRight + xOffset;
				const posY = rankZoneTopY + 1;

				const pixel = ctx.getImageData(posX, posY, 1, 1).data;
				if (
					!(
						getDifference(pixel[0], startPixel[0]) > 3 ||
						getDifference(pixel[1], startPixel[1]) > 3 ||
						getDifference(pixel[2], startPixel[2]) > 3
					)
				) {
					rankZoneLeft = rankZoneRight + xOffset + 1;
				}

				xOffset--;
			}

			// Define name zone
			nameZoneBeginX = rankZoneLeft;

			break;
		}
	}

	rankZoneHeight = rankZoneEndY - rankZoneTopY;
	rankZoneWidth = rankZoneRight - rankZoneLeft;

	// Check if size is too small
	if (rankZoneHeight < 5 || rankZoneWidth < 5) {
		return { error: true, message: 'final zone is too small' };
	}

	// Draw line from top right to bottom left
	ctx.strokeStyle = '#00FFFF';
	ctx.beginPath();
	ctx.moveTo(0, image.width);
	ctx.lineTo(image.height, 0);
	ctx.stroke();

	rankZoneHeight = rankZoneEndY - rankZoneTopY;
	rankZoneWidth = rankZoneRight - rankZoneLeft;

	// Define name zone as rank zone minus height
	nameZoneBeginY = rankZoneTopY - rankZoneHeight;

	nameZoneBeginX = rankZoneLeft;

	// Crop canvas to name zone
	const nameZoneCanvas = createCanvas(rankZoneWidth, rankZoneHeight);
	const nameZoneCtx = nameZoneCanvas.getContext('2d');
	nameZoneCtx.drawImage(image, nameZoneBeginX, nameZoneBeginY, rankZoneWidth, rankZoneHeight, 0, 0, rankZoneWidth, rankZoneHeight);

	const filteredCanvas = createCanvas(rankZoneWidth, rankZoneHeight);
	const filteredCtx = filteredCanvas.getContext('2d');

	filteredCtx.fillStyle = '#ffffff';
	filteredCtx.fillRect(0, 0, rankZoneWidth, rankZoneHeight);
	filteredCtx.fillStyle = '#000000';

	for (let x = 0; x < rankZoneWidth; x++) {
		for (let y = 0; y < rankZoneWidth; y++) {
			const pixel = nameZoneCtx.getImageData(x, y, 1, 1).data;
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

	const text = parts.text
		.split('\n')[0]
		.split('#')
		.map((t) => t.trim());

	return { success: true, parts: text.slice(0, 2) };

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
}
