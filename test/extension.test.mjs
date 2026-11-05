import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { runLeadVerification } from '../extension/src/api-client.js';
import { extractPageLeadsInTab } from '../extension/src/content-extractor.js';
import {
	buildWhatsAppChatUrl,
	compareCallerIdWithLead,
	isPrivateOrReservedIp,
	isValidIpAddress,
	normalizeDomainInput,
	normalizeEmailInput,
	normalizePhoneInput,
	parseSmartContactInput,
	serializeRecordsToCsv,
} from '../extension/src/parser.js';
import {
	appendHistory,
	clearHistory,
	clearVerificationCache,
	computeLookupHash,
	getCachedVerification,
	getHistory,
	setCachedVerification,
} from '../extension/src/storage.js';
import { handleEdgeRequest } from '../edge-worker/src/worker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('Manifest V3 & Chrome Web Store policy compliance (zero <all_urls>, strict CSP, clean HTML)', () => {
	const manifest = JSON.parse(
		fs.readFileSync(path.join(ROOT, 'extension', 'manifest.json'), 'utf8'),
	);
	assert.equal(manifest.manifest_version, 3);
	assert.ok(manifest.name.length <= 45, `Name length ${manifest.name.length} > 45`);
	assert.ok(manifest.description.length <= 132, `Description length ${manifest.description.length} > 132`);
	assert.deepEqual(manifest.permissions, [
		'sidePanel',
		'activeTab',
		'scripting',
		'contextMenus',
		'storage',
	]);
	for (const hp of manifest.host_permissions) {
		assert.match(hp, /^https:\/\/([a-z0-9-]+\.)?proweblook\.com\/\*/);
	}

	const html = fs.readFileSync(path.join(ROOT, 'extension', 'sidepanel.html'), 'utf8');
	assert.doesNotMatch(html, /\son[a-z]+\s*=/i, 'No inline event attributes allowed under MV3 CSP');
	assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i, 'No inline <script> blocks allowed');
});

test('Smart Contact Signature Parser & Normalizers handle emails, E.164 phones, domains, IPs, and signatures', () => {
	assert.equal(normalizeEmailInput('mailto:Alex.Morgan@Stripe.com?subject=Hi'), 'alex.morgan@stripe.com');
	assert.equal(normalizeEmailInput('banner@2x.png'), '');
	assert.equal(normalizeEmailInput('user@sentry.io'), '');

	assert.equal(normalizePhoneInput('https://wa.me/919038655955?text=hi'), '919038655955');
	assert.equal(normalizePhoneInput('+1 (415) 555-2671'), '+14155552671');
	assert.equal(normalizePhoneInput('0044 7911 123456'), '+447911123456');
	assert.equal(buildWhatsAppChatUrl('+91-90386-55955'), 'https://wa.me/919038655955');

	assert.equal(normalizeDomainInput('https://www.ProWebLook.com/pricing?ref=1'), 'proweblook.com');
	assert.equal(isValidIpAddress('8.8.8.8'), true);
	assert.equal(isPrivateOrReservedIp('192.168.1.1'), true);
	assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);

	const sig = parseSmartContactInput(
		'Chandan Dubey | Founder | info@proweblook.com | +91 90386 55955 | https://proweblook.com',
	);
	assert.equal(sig.contactName, 'Chandan Dubey');
	assert.equal(sig.email, 'info@proweblook.com');
	assert.equal(sig.phone, '+919038655955');
	assert.equal(sig.domain, 'proweblook.com');

	assert.equal(compareCallerIdWithLead('CHANDAN KUMAR DUBEY', 'Chandan Dubey', ''), 'matched');
	assert.equal(compareCallerIdWithLead('JOHN SMITH', 'Chandan Dubey', 'Acme'), 'mismatch');
});

test('Multi-Signal Lead Verification scores Trusted corporate leads and High-Risk burner/VoIP leads', async () => {
	const mockFetchTrusted = async (url) => {
		const u = String(url);
		if (u.includes('/phonevalidation')) {
			return new Response(
				JSON.stringify({
					status: 'VALID_CONFIRMED',
					formatted_number: '+919038655955',
					linetype: 'Mobile',
					carrier: 'Tata Docomo',
					countrycode: 'IN',
					countryname: 'India',
				}),
				{ status: 200 },
			);
		}
		if (u.includes('/wavalidation')) {
			return new Response(JSON.stringify({ status: true, numberstatus: true, businessnumber: true }), {
				status: 200,
			});
		}
		if (u.includes('/calleridvalidation')) {
			return new Response(JSON.stringify({ caller_name: 'CHANDAN KUMAR D', carrier: 'Tata' }), {
				status: 200,
			});
		}
		if (u.includes('/emailvalidation')) {
			return new Response(
				JSON.stringify({
					status: true,
					email: 'info@proweblook.com',
					verdict: 'deliverable',
					emailformat: true,
					emailexist: true,
					reason_code: 'deliverable',
				}),
				{ status: 200 },
			);
		}
		if (u.includes('/blacklistchecker')) {
			return new Response(JSON.stringify({ listed: false, listed_count: 0, total_checked: 52 }), {
				status: 200,
			});
		}
		throw new Error(`Unexpected URL: ${u}`);
	};

	const { report } = await runLeadVerification({
		email: 'info@proweblook.com',
		phoneNumber: '+919038655955',
		contactName: 'Chandan Dubey',
		apiKey: 'test_pwl_key',
		fetchImpl: mockFetchTrusted,
	});

	assert.equal(report.riskLevel, 'trusted');
	assert.ok(report.trustScore >= 95, `Expected >=95, got ${report.trustScore}`);
	assert.equal(report.signals.whatsapp.isBusiness, true);
	assert.equal(report.signals.callerId.callerNameMatch, 'matched');

	const csv = serializeRecordsToCsv([report]);
	assert.match(csv, /info@proweblook\.com/);
	assert.match(csv, /whatsapp_business/);

	// High-risk disposable + VoIP check
	const mockFetchRisky = async (url) => {
		const u = String(url);
		if (u.includes('/phonevalidation')) {
			return new Response(
				JSON.stringify({ status: 'VALID_CONFIRMED', linetype: 'VoIP', carrier: 'Twilio' }),
				{ status: 200 },
			);
		}
		if (u.includes('/wavalidation')) {
			return new Response(JSON.stringify({ status: true, numberstatus: false }), { status: 200 });
		}
		if (u.includes('/calleridvalidation')) {
			return new Response(JSON.stringify({ caller_name: '' }), { status: 200 });
		}
		if (u.includes('/emailvalidation')) {
			return new Response(JSON.stringify({ status: true, verdict: 'deliverable' }), { status: 200 });
		}
		return new Response(JSON.stringify({}), { status: 200 });
	};

	const { report: risky } = await runLeadVerification({
		email: 'fraud@mailinator.com',
		phoneNumber: '+14155550100',
		apiKey: 'test_pwl_key',
		fetchImpl: mockFetchRisky,
	});
	assert.equal(risky.riskLevel, 'high_risk');
	assert.ok(risky.trustScore < 35);
});

test('Active-Tab DOM Extractor captures mailto, tel, wa.me, visible phones/emails, IPs & socials cleanly', () => {
	const fakeLinks = [
		{ href: 'mailto:sales@acme.io?subject=Demo', textContent: 'Email Sales' },
		{ href: 'tel:+1-650-555-0199', textContent: 'Call HQ' },
		{ href: 'https://wa.me/919038655955', textContent: 'WhatsApp Us' },
		{ href: 'https://www.linkedin.com/company/proweblook/', textContent: 'LinkedIn' },
	].map((l) => ({
		getAttribute: (k) => (k === 'href' ? l.href : null),
		textContent: l.textContent,
	}));

	const fakeDoc = {
		title: 'Contact Acme Corp',
		querySelectorAll: () => fakeLinks,
		body: {
			innerText:
				'Reach support@acme.io or banner@2x.png or user@example.com. UK Desk: +44 20 7946 0958. Edge Node: 8.8.4.4 and internal 192.168.0.1.',
		},
	};

	const res = extractPageLeadsInTab(fakeDoc, 'https://www.acme.io/contact');
	assert.equal(res.pageDomain, 'acme.io');
	assert.deepEqual(
		res.emails.map((e) => e.email),
		['sales@acme.io', 'support@acme.io'],
	);
	assert.equal(res.phones.length, 3);
	assert.deepEqual(res.ips, ['8.8.4.4']);
	assert.deepEqual(res.socials, ['https://www.linkedin.com/company/proweblook']);
});

test('Storage Vault caches 24h lookups by SHA-256 hash and persists local history', async () => {
	await clearVerificationCache();
	await clearHistory();

	const hash = await computeLookupHash(
		{ email: 'info@proweblook.com', phoneNumber: '+919038655955' },
		{ enableEmail: true, enablePhone: true },
	);
	assert.equal(hash.length, 32);

	await setCachedVerification(hash, { trustScore: 98, riskLevel: 'trusted', lookupHash: hash });
	const cached = await getCachedVerification(hash, 24);
	assert.equal(cached.trustScore, 98);

	await appendHistory(cached);
	const hist = await getHistory();
	assert.equal(hist.length, 1);
	assert.equal(hist[0].trustScore, 98);
});

test('Edge Companion Worker serves Privacy/Landing pages and enforces 15-check Starter Sandbox quota', async () => {
	const kvMap = new Map();
	const mockKv = {
		get: async (k) => kvMap.get(k) ?? null,
		put: async (k, v) => {
			kvMap.set(k, String(v));
		},
	};

	const env = {
		PROWEBLOOK_STARTER_API_KEY: 'starter_secret_key',
		PROWEBLOOK_CHROME_KV: mockKv,
		SANDBOX_LIMIT: '2',
	};

	const privRes = await handleEdgeRequest(new Request('https://ext.proweblook.com/privacy'), env);
	assert.equal(privRes.status, 200);
	const privHtml = await privRes.text();
	assert.match(privHtml, /Limited Use/);

	const mockProviderFetch = async (url) => {
		if (String(url).includes('/blacklistchecker')) {
			return new Response(JSON.stringify({ listed: false, listed_count: 0, total_checked: 45 }), {
				status: 200,
			});
		}
		return new Response(JSON.stringify({ status: true, verdict: 'deliverable', emailexist: true }), {
			status: 200,
		});
	};

	// Check 1 of 2
	const r1 = await handleEdgeRequest(
		new Request('https://ext.proweblook.com/api/v1/trial-verify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-PWL-Install-Id': 'inst_abc1234567890123' },
			body: JSON.stringify({ email: 'info@proweblook.com' }),
		}),
		env,
		mockProviderFetch,
	);
	assert.equal(r1.status, 200);
	const d1 = await r1.json();
	assert.equal(d1.report.mode, 'sandbox');
	assert.equal(d1.sandbox.remaining, 1);

	// Check 2 of 2
	const r2 = await handleEdgeRequest(
		new Request('https://ext.proweblook.com/api/v1/trial-verify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-PWL-Install-Id': 'inst_abc1234567890123' },
			body: JSON.stringify({ email: 'hello@proweblook.com' }),
		}),
		env,
		mockProviderFetch,
	);
	assert.equal(r2.status, 200);
	const d2 = await r2.json();
	assert.equal(d2.sandbox.remaining, 0);

	// Check 3 -> 429 sandbox_exhausted
	const r3 = await handleEdgeRequest(
		new Request('https://ext.proweblook.com/api/v1/trial-verify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-PWL-Install-Id': 'inst_abc1234567890123' },
			body: JSON.stringify({ email: 'third@proweblook.com' }),
		}),
		env,
		mockProviderFetch,
	);
	assert.equal(r3.status, 429);
	const d3 = await r3.json();
	assert.equal(d3.code, 'sandbox_exhausted');
});
