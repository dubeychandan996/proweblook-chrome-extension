/**
 * Self-contained Active-Tab Lead, Email, Phone, Domain & Social Extractor.
 * IMPORTANT: `extractPageLeadsInTab` is serialized via `chrome.scripting.executeScript({ func })`,
 * so all helpers MUST live inside `extractPageLeadsInTab` with zero external closures.
 */

export function extractPageLeadsInTab(overrideDoc, overrideUrl) {
	const doc = overrideDoc || (typeof document !== 'undefined' ? document : null);
	const pageUrl = overrideUrl || (typeof location !== 'undefined' ? location.href : '');
	if (!doc) {
		return {
			pageTitle: '',
			pageUrl: '',
			pageDomain: '',
			emails: [],
			phones: [],
			ips: [],
			socials: [],
		};
	}

	const ignoredEmailDomains = new Set([
		'example.com',
		'example.org',
		'test.com',
		'domain.com',
		'email.com',
		'yoursite.com',
		'yourdomain.com',
		'sentry.io',
		'sentry-next.wixpress.com',
		'wixpress.com',
		'w3.org',
		'schema.org',
	]);
	const ignoredExtRe = /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2|ttf|map|json|xml)$/i;

	const cleanEmail = (raw) => {
		const e = String(raw || '')
			.trim()
			.replace(/^mailto:/i, '')
			.split('?')[0]
			.trim()
			.toLowerCase();
		if (!e || e.length > 254 || ignoredExtRe.test(e)) return '';
		const m = e.match(/^[a-z0-9._%+-]+@([a-z0-9.-]+\.[a-z]{2,24})$/);
		if (!m || ignoredEmailDomains.has(m[1])) return '';
		return e;
	};

	const cleanPhone = (raw) => {
		let p = String(raw || '')
			.trim()
			.replace(/^(tel:|whatsapp:\/\/send\?phone=|https?:\/\/wa\.me\/|https?:\/\/api\.whatsapp\.com\/send\?phone=)/i, '');
		p = p.split('&')[0].split('?')[0].trim();
		if (!p) return '';
		const hasPlus = p.startsWith('+') || p.startsWith('00');
		const digits = p.replace(/\D+/g, '');
		if (digits.length < 8 || digits.length > 15) return '';
		if (/^(19|20)\d{6}$/.test(digits)) return '';
		if (/^(\d)\1{7,}$/.test(digits)) return '';
		if (p.startsWith('00') && digits.length >= 9) return `+${digits.slice(2)}`;
		return hasPlus ? `+${digits}` : digits;
	};

	let pageDomain = '';
	try {
		const parsed = new URL(pageUrl);
		if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
			pageDomain = parsed.hostname.replace(/^www\./i, '').toLowerCase();
		}
	} catch (_) {
		pageDomain = '';
	}

	const emailMap = new Map();
	const phoneMap = new Map();
	const socialSet = new Set();

	const links = Array.from(doc.querySelectorAll ? doc.querySelectorAll('a[href]') : []);
	for (const a of links) {
		const href = String(a.getAttribute('href') || '').trim();
		const label = String(a.textContent || '').trim().slice(0, 80);
		if (!href) continue;

		if (/^mailto:/i.test(href)) {
			const em = cleanEmail(href);
			if (em && !emailMap.has(em)) {
				emailMap.set(em, { email: em, source: 'mailto', context: label !== em ? label : '' });
			}
		} else if (/^tel:/i.test(href) || /wa\.me\/|api\.whatsapp\.com\/send/i.test(href)) {
			const ph = cleanPhone(href);
			if (ph) {
				const key = ph.replace(/\D+/g, '');
				if (!phoneMap.has(key)) {
					phoneMap.set(key, {
						phone: ph,
						source: /wa\.me|whatsapp/i.test(href) ? 'whatsapp_link' : 'tel_link',
						context: label,
					});
				}
			}
		} else if (/https?:\/\/(?:www\.)?(linkedin\.com\/(?:in|company)\/[^\s/?#]+|x\.com\/[a-zA-Z0-9_]{2,30}|twitter\.com\/[a-zA-Z0-9_]{2,30}|github\.com\/[a-zA-Z0-9_-]{2,40})/i.test(href)) {
			const cleanedSocial = href.split('?')[0].replace(/\/+$/, '');
			if (
				!/\/(share|intent|home|login|signup|explore|settings|hashtag|search)\b/i.test(cleanedSocial) &&
				socialSet.size < 25
			) {
				socialSet.add(cleanedSocial);
			}
		}
	}

	const bodyText = String(doc.body?.innerText || doc.documentElement?.textContent || '').slice(0, 250000);

	// Visible emails
	const emailMatches = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g) || [];
	for (const candidate of emailMatches) {
		if (emailMap.size >= 50) break;
		const em = cleanEmail(candidate);
		if (em && !emailMap.has(em)) {
			emailMap.set(em, { email: em, source: 'page_text', context: '' });
		}
	}

	// International + structured phones in visible text
	const phoneRegex = /(?:\+\d{1,3}[\s.-]?(?:\(?\d{2,5}\)?[\s.-]?){2,4}\d{2,6})|(?:\(\d{3}\)\s?\d{3}[\s.-]\d{4})/g;
	const phoneMatches = bodyText.match(phoneRegex) || [];
	for (const candidate of phoneMatches) {
		if (phoneMap.size >= 40) break;
		const ph = cleanPhone(candidate);
		if (ph) {
			const key = ph.replace(/\D+/g, '');
			if (!phoneMap.has(key)) {
				phoneMap.set(key, { phone: ph, source: 'page_text', context: candidate.trim() });
			}
		}
	}

	// Public IPv4s (useful on email headers, logs, security consoles, WHOIS pages)
	const ipSet = new Set();
	const ipMatches = bodyText.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [];
	for (const ip of ipMatches) {
		if (ipSet.size >= 15) break;
		const parts = ip.split('.').map(Number);
		if (parts.some((n) => n < 0 || n > 255)) continue;
		const [a, b] = parts;
		if (a === 0 || a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) {
			continue;
		}
		// Skip version numbers like 1.2.3.4 when preceded by v or small numbers
		if (a <= 5 && b <= 20 && parts[2] <= 20 && parts[3] <= 30) continue;
		ipSet.add(ip);
	}

	return {
		pageTitle: String(doc.title || '').trim().slice(0, 140),
		pageUrl,
		pageDomain,
		emails: Array.from(emailMap.values()),
		phones: Array.from(phoneMap.values()),
		ips: Array.from(ipSet),
		socials: Array.from(socialSet),
	};
}
