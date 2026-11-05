/**
 * Validates `extension/` for Chrome Web Store Manifest V3 compliance and builds
 * `dist/proweblook-chrome-extension.zip`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXT_DIR = path.join(ROOT, 'extension');
const DIST_DIR = path.join(ROOT, 'dist');
const ZIP_PATH = path.join(DIST_DIR, 'proweblook-chrome-extension.zip');

const manifest = JSON.parse(fs.readFileSync(path.join(EXT_DIR, 'manifest.json'), 'utf8'));

if (manifest.manifest_version !== 3) {
	throw new Error('manifest_version must be 3');
}
if (manifest.name.length > 45) {
	throw new Error(`Extension name exceeds 45 chars (${manifest.name.length})`);
}
if (manifest.description.length > 132) {
	throw new Error(`Extension description exceeds 132 chars (${manifest.description.length})`);
}
if ((manifest.host_permissions || []).some((h) => h.includes('<all_urls>') || h === 'https://*/*' || h === '*://*/*')) {
	throw new Error('Broad host_permissions (<all_urls>) detected — forbidden for fast CWS review');
}

for (const sz of ['16', '32', '48', '128']) {
	const rel = manifest.icons?.[sz];
	if (!rel || !fs.existsSync(path.join(EXT_DIR, rel))) {
		throw new Error(`Missing icon ${sz}: ${rel}`);
	}
}

// Secret scan across all extension files
function walkFiles(dir) {
	const out = [];
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		if (ent.name.startsWith('.')) continue;
		const full = path.join(dir, ent.name);
		if (ent.isDirectory()) out.push(...walkFiles(full));
		else out.push(full);
	}
	return out;
}

const secretPatterns = [/sk_live_[A-Za-z0-9]+/, /AIza[0-9A-Za-z_-]{35}/, /ghp_[A-Za-z0-9]{30,}/];
for (const file of walkFiles(EXT_DIR)) {
	if (file.endsWith('.png')) continue;
	const text = fs.readFileSync(file, 'utf8');
	for (const re of secretPatterns) {
		if (re.test(text)) {
			throw new Error(`Potential secret detected in ${file}`);
		}
	}
}

fs.mkdirSync(DIST_DIR, { recursive: true });
if (fs.existsSync(ZIP_PATH)) {
	fs.unlinkSync(ZIP_PATH);
}

execFileSync('zip', ['-r', '-q', ZIP_PATH, '.', '-x', '.*', '*/.*'], { cwd: EXT_DIR });
const stat = fs.statSync(ZIP_PATH);
console.log(`Built ${ZIP_PATH} (${stat.size} bytes) — Manifest V3 verified clean!`);
