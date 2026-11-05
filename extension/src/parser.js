/**
 * Smart Contact & Signal Parser, Normalizers, Caller ID Matcher & CSV Exporter.
 * Pure ES module with zero external dependencies.
 */

export const DISPOSABLE_EMAIL_DOMAINS = new Set([
	'10minutemail.com',
	'10minutemail.net',
	'burnermail.io',
	'dispostable.com',
	'emailondeck.com',
	'fakeinbox.com',
	'getairmail.com',
	'getnada.com',
	'guerrillamail.com',
	'guerrillamailblock.com',
	'inboxkitten.com',
	'mailcatch.com',
	'maildrop.cc',
	'mailinator.com',
	'mailnesia.com',
	'mohmal.com',
	'mytemp.email',
	'sharklasers.com',
	'temp-mail.io',
	'temp-mail.org',
	'tempail.com',
	'tempmail.com',
	'tempmailo.com',
	'throwawaymail.com',
	'trashmail.com',
	'yopmail.com',
	'yopmail.fr',
	'yopmail.net',
]);

export const FREE_WEBMAIL_DOMAINS = new Set([
	'gmail.com',
	'googlemail.com',
	'yahoo.com',
	'yahoo.co.in',
	'yahoo.co.uk',
	'outlook.com',
	'hotmail.com',
	'live.com',
	'msn.com',
	'icloud.com',
	'me.com',
	'mac.com',
	'aol.com',
	'proton.me',
	'protonmail.com',
	'zoho.com',
	'zohomail.in',
	'rediffmail.com',
	'gmx.com',
	'yandex.com',
]);

export const HOSTING_PROXY_KEYWORDS = [
	'digitalocean',
	'amazonaws',
	'amazon.com',
	'amazon technologies',
	'google cloud',
	'hetzner',
	'ovh',
	'linode',
	'akamai connected',
	'vultr',
	'choopa',
	'm247',
	'datacamp',
	'contabo',
	'hostinger',
	'tzulo',
	'leaseweb',
	'quadranet',
	'vpn',
	'tor exit',
	'mullvad',
	'nordvpn',
];

const IGNORED_EMAIL_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2|ttf|map|json|xml)$/i;
const IGNORED_EMAIL_DOMAINS = new Set([
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

export function normalizeEmailInput(input = '') {
	const raw = String(input || '')
		.trim()
		.replace(/^mailto:/i, '')
		.split('?')[0]
		.trim()
		.toLowerCase();
	if (!raw || raw.length > 254) return '';
	if (IGNORED_EMAIL_EXTENSIONS.test(raw)) return '';
	const match = raw.match(/^[a-z0-9._%+-]+@([a-z0-9.-]+\.[a-z]{2,24})$/);
	if (!match) return '';
	if (IGNORED_EMAIL_DOMAINS.has(match[1])) return '';
	return raw;
}

export function extractEmailDomain(email = '') {
	const clean = normalizeEmailInput(email);
	if (!clean) return '';
	const at = clean.lastIndexOf('@');
	return at > 0 ? clean.slice(at + 1) : '';
}

export function isDisposableEmailDomain(email = '') {
	const domain = extractEmailDomain(email) || normalizeDomainInput(email);
	return Boolean(domain && DISPOSABLE_EMAIL_DOMAINS.has(domain));
}

export function normalizePhoneInput(input = '') {
	let raw = String(input || '')
		.trim()
		.replace(/^(tel:|whatsapp:\/\/send\?phone=|https?:\/\/wa\.me\/|https?:\/\/api\.whatsapp\.com\/send\?phone=)/i, '');
	raw = raw.split('&')[0].split('?')[0].trim();
	if (!raw) return '';
	const hasLeadingPlus = raw.startsWith('+') || raw.startsWith('00');
	const digits = raw.replace(/\D+/g, '');
	if (digits.length < 7 || digits.length > 15) return '';
	// Reject obvious date strings like 20261105 or sequential dummy digits
	if (/^(19|20)\d{6}$/.test(digits)) return '';
	if (raw.startsWith('00') && digits.length >= 9) {
		return `+${digits.slice(2)}`;
	}
	return hasLeadingPlus ? `+${digits}` : digits;
}

export function buildWhatsAppChatUrl(phone = '') {
	const clean = normalizePhoneInput(phone);
	const digits = clean.replace(/\D+/g, '');
	if (digits.length < 8) return '';
	return `https://wa.me/${digits}`;
}

export function isValidIpAddress(input = '') {
	const raw = String(input || '').trim();
	if (!raw) return false;
	// IPv4
	const ipv4 = raw.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (ipv4) {
		return ipv4.slice(1).every((oct) => Number(oct) >= 0 && Number(oct) <= 255);
	}
	// Basic IPv6 check
	if (raw.includes(':') && /^[0-9a-fA-F:]{2,39}$/.test(raw) && (raw.match(/:/g) || []).length >= 2) {
		return true;
	}
	return false;
}

export function isPrivateOrReservedIp(ip = '') {
	const raw = String(ip || '').trim();
	if (!isValidIpAddress(raw)) return true;
	if (raw.includes(':')) {
		return raw === '::1' || raw.toLowerCase().startsWith('fe80:') || raw.toLowerCase().startsWith('fc') || raw.toLowerCase().startsWith('fd');
	}
	const [a, b] = raw.split('.').map(Number);
	if (a === 10 || a === 127 || a === 0) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	if (a === 169 && b === 254) return true;
	return false;
}

export function normalizeDomainInput(input = '') {
	let raw = String(input || '').trim().toLowerCase();
	if (!raw || raw.includes('@') || isValidIpAddress(raw)) return '';
	raw = raw.replace(/^[a-z]+:\/\//i, '').replace(/^www\./i, '');
	raw = raw.split('/')[0].split('?')[0].split('#')[0].split(':')[0].trim();
	if (!raw || raw.length > 253) return '';
	if (IGNORED_EMAIL_EXTENSIONS.test(raw)) return '';
	if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(raw)) {
		return '';
	}
	const tld = raw.split('.').pop() || '';
	if (!/^[a-z]{2,24}$/.test(tld)) return '';
	return raw;
}

/**
 * Classifies a single highlighted token or pasted string into structured verification fields.
 * Supports multi-line email signatures like:
 *   "Jane Doe | VP Growth | jane@stripe.com | +1 (415) 555-2671 | https://stripe.com"
 */
export function parseSmartContactInput(rawText = '') {
	const text = String(rawText || '').trim();
	const out = {
		email: '',
		phone: '',
		domain: '',
		ip: '',
		contactName: '',
	};
	if (!text) return out;

	// Single-value fast paths
	const directEmail = normalizeEmailInput(text);
	if (directEmail) {
		out.email = directEmail;
		const dom = extractEmailDomain(directEmail);
		if (dom && !FREE_WEBMAIL_DOMAINS.has(dom) && !DISPOSABLE_EMAIL_DOMAINS.has(dom)) {
			out.domain = dom;
		}
		return out;
	}

	if (isValidIpAddress(text)) {
		out.ip = text;
		return out;
	}

	const directDomain = normalizeDomainInput(text);
	if (directDomain && !/\s/.test(text)) {
		out.domain = directDomain;
		return out;
	}

	const directPhone = normalizePhoneInput(text);
	if (directPhone && /^[\d+\s().-]{7,24}$/.test(text)) {
		out.phone = directPhone;
		return out;
	}

	// Multi-token / signature block extraction
	const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/);
	if (emailMatch) {
		const normalized = normalizeEmailInput(emailMatch[0]);
		if (normalized) out.email = normalized;
	}

	const ipMatch = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
	if (ipMatch && isValidIpAddress(ipMatch[0]) && !isPrivateOrReservedIp(ipMatch[0])) {
		out.ip = ipMatch[0];
	}

	const phoneMatch = text.match(/(?:\+|00)\d{1,3}[\s.-]?(?:\(?\d{2,5}\)?[\s.-]?){2,4}\d{2,6}|\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/);
	if (phoneMatch) {
		const p = normalizePhoneInput(phoneMatch[0]);
		if (p) out.phone = p;
	}

	const urlOrDomainMatch = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,16})(?:\/[^\s|,]*)?/g);
	if (urlOrDomainMatch) {
		for (const candidate of urlOrDomainMatch) {
			if (out.email && out.email.endsWith(candidate.toLowerCase())) continue;
			const d = normalizeDomainInput(candidate);
			if (d && !FREE_WEBMAIL_DOMAINS.has(d) && !DISPOSABLE_EMAIL_DOMAINS.has(d) && !['linkedin.com', 'x.com', 'twitter.com', 'facebook.com', 'instagram.com'].includes(d)) {
				out.domain = d;
				break;
			}
		}
	}

	if (!out.domain && out.email) {
		const emailDom = extractEmailDomain(out.email);
		if (emailDom && !FREE_WEBMAIL_DOMAINS.has(emailDom) && !DISPOSABLE_EMAIL_DOMAINS.has(emailDom)) {
			out.domain = emailDom;
		}
	}

	// Try to find a clean human name from the first segment/line if it looks like 2–4 alphabetic words
	const segments = text
		.split(/[\n|•·,;]+/)
		.map((s) => s.trim())
		.filter(Boolean);
	for (const seg of segments) {
		if (seg.includes('@') || /\d/.test(seg) || seg.includes('.com') || seg.includes('http')) continue;
		const words = seg.split(/\s+/);
		if (
			words.length >= 2 &&
			words.length <= 4 &&
			words.every((w) => /^[A-Z][a-zA-Z'-]{1,20}$/.test(w)) &&
			!/^(vp|ceo|cto|founder|director|head|sales|support|marketing|contact|phone|email|mobile)$/i.test(words[0])
		) {
			out.contactName = seg;
			break;
		}
	}

	return out;
}

export function compareCallerIdWithLead(callerName = '', contactName = '', companyName = '') {
	const cleanCaller = String(callerName || '').trim();
	if (!cleanCaller) return 'unlisted';

	const stopWords = new Set(['inc', 'llc', 'ltd', 'pvt', 'corp', 'the', 'and', 'mr', 'mrs', 'ms', 'dr']);
	const tokenize = (str) =>
		String(str || '')
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, ' ')
			.split(/\s+/)
			.filter((t) => t.length >= 3 && !stopWords.has(t));

	const callerTokens = tokenize(cleanCaller);
	const targetTokens = [...tokenize(contactName), ...tokenize(companyName)];
	if (callerTokens.length === 0 || targetTokens.length === 0) {
		return 'found_uncompared';
	}

	const matched = callerTokens.some((ct) =>
		targetTokens.some(
			(tt) => ct === tt || (ct.length >= 4 && tt.startsWith(ct)) || (tt.length >= 4 && ct.startsWith(tt)),
		),
	);
	return matched ? 'matched' : 'mismatch';
}

export function serializeRecordsToCsv(records = []) {
	const headers = [
		'verified_at',
		'trust_score',
		'risk_level',
		'contact_name',
		'email',
		'email_verdict',
		'email_type',
		'phone',
		'phone_formatted',
		'phone_line_type',
		'phone_carrier',
		'whatsapp_status',
		'caller_id_name',
		'caller_name_match',
		'domain',
		'domain_blacklist',
		'ip',
		'ip_country',
		'ip_isp',
		'ip_hosting_proxy',
		'summary',
	];

	const escapeCell = (val) => {
		const s = val === null || val === undefined ? '' : String(val);
		if (/[",\r\n]/.test(s)) {
			return `"${s.replace(/"/g, '""')}"`;
		}
		return s;
	};

	const rows = [headers.join(',')];
	for (const rec of records) {
		const sig = rec.signals || {};
		const waStatus = sig.whatsapp
			? sig.whatsapp.registered
				? sig.whatsapp.isBusiness
					? 'whatsapp_business'
					: 'on_whatsapp'
				: 'not_on_whatsapp'
			: '';
		const row = [
			rec.verifiedAt || '',
			rec.trustScore ?? '',
			rec.riskLevel || '',
			rec.inputs?.contactName || '',
			sig.email?.email || rec.inputs?.email || '',
			sig.email?.verdict || '',
			sig.email?.emailType || '',
			rec.inputs?.phoneNumber || '',
			sig.phone?.formattedNumber || '',
			sig.phone?.lineType || sig.callerId?.lineType || '',
			sig.phone?.carrier || sig.callerId?.carrier || '',
			waStatus,
			sig.callerId?.callerName || '',
			sig.callerId?.callerNameMatch || '',
			sig.domainBlacklist?.target || rec.inputs?.domain || '',
			sig.domainBlacklist ? (sig.domainBlacklist.listed ? `listed (${sig.domainBlacklist.listedCount})` : 'clean') : '',
			sig.ipGeo?.ip || rec.inputs?.ipAddress || '',
			sig.ipGeo?.countryCode || '',
			sig.ipGeo?.isp || '',
			sig.ipGeo ? String(Boolean(sig.ipGeo.isHostingOrProxy)) : '',
			rec.summary || '',
		];
		rows.push(row.map(escapeCell).join(','));
	}

	return rows.join('\r\n');
}
