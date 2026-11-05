/**
 * Generates supersampled RGBA PNG icons (16, 32, 48, 128) following Google's
 * Chrome Web Store Icon Spec (128x128 canvas = 96x96 icon + 16px transparent margin),
 * plus provides a helper to convert any 32-bit RGBA PNG into a strict 24-bit RGB PNG (colorType=2, no alpha)
 * as required by Chrome Web Store for Screenshots (1280x800) and Promo Tiles (440x280, 1400x560).
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function crc32(buf) {
	let crc = 0xffffffff;
	for (let i = 0; i < buf.length; i++) {
		crc ^= buf[i];
		for (let j = 0; j < 8; j++) {
			crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
	const typeBuf = Buffer.from(type, 'ascii');
	const lenBuf = Buffer.alloc(4);
	lenBuf.writeUInt32BE(data.length, 0);
	const crcBuf = Buffer.alloc(4);
	crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
	return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

export function encodeRgbaPng(width, height, rgba) {
	const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // RGBA
	ihdr[10] = 0;
	ihdr[11] = 0;
	ihdr[12] = 0;

	const stride = width * 4;
	const raw = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y++) {
		raw[y * (stride + 1)] = 0;
		rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
	}
	const idat = zlib.deflateSync(raw, { level: 9 });
	return Buffer.concat([
		sig,
		makeChunk('IHDR', ihdr),
		makeChunk('IDAT', idat),
		makeChunk('IEND', Buffer.alloc(0)),
	]);
}

export function encodeRgb24Png(width, height, rgb) {
	const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 2; // Truecolor RGB (24-bit, NO alpha channel!)
	ihdr[10] = 0;
	ihdr[11] = 0;
	ihdr[12] = 0;

	const stride = width * 3;
	const raw = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y++) {
		raw[y * (stride + 1)] = 0;
		rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
	}
	const idat = zlib.deflateSync(raw, { level: 9 });
	return Buffer.concat([
		sig,
		makeChunk('IHDR', ihdr),
		makeChunk('IDAT', idat),
		makeChunk('IEND', Buffer.alloc(0)),
	]);
}

function distToSegment(px, py, x1, y1, x2, y2) {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return Math.hypot(px - x1, py - y1);
	const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
	return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function roundedRectSdf(nx, ny, halfSize, radius) {
	const qx = Math.abs(nx) - (halfSize - radius);
	const qy = Math.abs(ny) - (halfSize - radius);
	return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

/**
 * Renders the ProWebLook icon on normalized [-1, 1] coordinates.
 * When padded=true (for 128x128 CWS icon), uses 96/128 = 0.75 active box so 16px transparent margin surrounds it.
 */
function sampleIconPixel(u, v, padded = false) {
	const scale = padded ? 1 / 0.75 : 1 / 0.88;
	const nx = (u * 2 - 1) * scale;
	const ny = (v * 2 - 1) * scale;

	// Rounded squircle tile
	const dBox = roundedRectSdf(nx, ny, 0.96, 0.26);
	if (dBox > 0.02) return [0, 0, 0, 0];

	// Smooth outer edge
	const alphaBox = Math.max(0, Math.min(1, (0.015 - dBox) / 0.03));

	// Rich deep slate -> indigo gradient background
	const gradT = Math.max(0, Math.min(1, (nx + ny + 2) / 4));
	let r = Math.round(14 + gradT * 46);
	let g = Math.round(22 + gradT * 38);
	let b = Math.round(48 + gradT * 135);

	// Subtle inner border glow
	if (dBox > -0.055 && dBox <= 0) {
		r = Math.min(255, r + 42);
		g = Math.min(255, g + 68);
		b = Math.min(255, b + 95);
	}

	// Inner Shield silhouette
	const sy = ny + 0.03;
	const shieldTop = -0.58;
	const shieldBottom = 0.64;
	let inShield = false;
	if (sy >= shieldTop && sy <= shieldBottom) {
		const tY = (sy - shieldTop) / (shieldBottom - shieldTop);
		const maxW = tY < 0.42 ? 0.54 : 0.54 * Math.pow(Math.max(0, 1 - (tY - 0.42) / 0.58), 0.72);
		// Slight crown slope at top
		const topCurve = shieldTop + Math.abs(nx) * 0.16;
		if (sy >= topCurve && Math.abs(nx) <= maxW) {
			inShield = true;
		}
	}

	if (inShield) {
		const st = Math.max(0, Math.min(1, (nx + sy + 1.1) / 2.2));
		// Sky (#38BDF8) -> Indigo (#6366F1) -> Emerald (#10B981)
		if (st < 0.55) {
			const k = st / 0.55;
			r = Math.round(56 * (1 - k) + 79 * k);
			g = Math.round(189 * (1 - k) + 70 * k);
			b = Math.round(248 * (1 - k) + 229 * k);
		} else {
			const k = (st - 0.55) / 0.45;
			r = Math.round(79 * (1 - k) + 16 * k);
			g = Math.round(70 * (1 - k) + 185 * k);
			b = Math.round(229 * (1 - k) + 129 * k);
		}
	}

	// Crisp white verification checkmark inside shield
	const d1 = distToSegment(nx, ny, -0.24, 0.03, -0.04, 0.23);
	const d2 = distToSegment(nx, ny, -0.04, 0.23, 0.29, -0.14);
	const dCheck = Math.min(d1, d2);
	const strokeRadius = 0.088;
	if (dCheck < strokeRadius + 0.025) {
		const w = Math.max(0, Math.min(1, (strokeRadius + 0.015 - dCheck) / 0.03));
		r = Math.round(r * (1 - w) + 255 * w);
		g = Math.round(g * (1 - w) + 255 * w);
		b = Math.round(b * (1 - w) + 255 * w);
	}

	return [r, g, b, Math.round(alphaBox * 255)];
}

function renderSupersampledIcon(size, padded = false) {
	const ss = 4;
	const out = Buffer.alloc(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			let rSum = 0;
			let gSum = 0;
			let bSum = 0;
			let aSum = 0;
			for (let sy = 0; sy < ss; sy++) {
				for (let sx = 0; sx < ss; sx++) {
					const u = (x + (sx + 0.5) / ss) / size;
					const v = (y + (sy + 0.5) / ss) / size;
					const [r, g, b, a] = sampleIconPixel(u, v, padded);
					const af = a / 255;
					rSum += r * af;
					gSum += g * af;
					bSum += b * af;
					aSum += af;
				}
			}
			const samples = ss * ss;
			const finalAlpha = aSum / samples;
			const idx = (y * size + x) * 4;
			if (finalAlpha <= 0.001) {
				out[idx] = 0;
				out[idx + 1] = 0;
				out[idx + 2] = 0;
				out[idx + 3] = 0;
			} else {
				out[idx] = Math.min(255, Math.round(rSum / aSum));
				out[idx + 1] = Math.min(255, Math.round(gSum / aSum));
				out[idx + 2] = Math.min(255, Math.round(bSum / aSum));
				out[idx + 3] = Math.min(255, Math.round(finalAlpha * 255));
			}
		}
	}
	return encodeRgbaPng(size, size, out);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const iconsDir = path.join(ROOT, 'extension', 'icons');
	const storeDir = path.join(ROOT, 'store-assets');
	fs.mkdirSync(iconsDir, { recursive: true });
	fs.mkdirSync(storeDir, { recursive: true });

	for (const sz of [16, 32, 48]) {
		fs.writeFileSync(path.join(iconsDir, `icon-${sz}.png`), renderSupersampledIcon(sz, false));
	}
	const icon128 = renderSupersampledIcon(128, true);
	fs.writeFileSync(path.join(iconsDir, 'icon-128.png'), icon128);
	fs.writeFileSync(path.join(storeDir, 'store-icon-128.png'), icon128);
	console.log('Generated extension icons (16, 32, 48, 128) + store-icon-128.png');
}
