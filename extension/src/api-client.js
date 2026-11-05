/**
 * ProWebLook Multi-Signal Verification Engine & API Client.
 * Supports:
 *  1) Direct BYOK calls to official ProWebLook endpoints (lookup.proweblook.com, proweblook.com, ipapi.proweblook.com)
 *  2) Zero-Signup Free Starter Sandbox via https://ext.proweblook.com/api/v1/trial-verify (15 free checks, zero secrets in extension)
 */

import {
	FREE_WEBMAIL_DOMAINS,
	HOSTING_PROXY_KEYWORDS,
	compareCallerIdWithLead,
	extractEmailDomain,
	isDisposableEmailDomain,
	isValidIpAddress,
	normalizeDomainInput,
	normalizeEmailInput,
	normalizePhoneInput,
} from './parser.js';

export const LOOKUP_BASE_URL = 'https://lookup.proweblook.com/api/v1';
export const MONOLITH_BASE_URL = 'https://proweblook.com/api/v1';
export const IPAPI_BASE_URL = 'https://ipapi.proweblook.com';
export const EDGE_SANDBOX_BASE_URL = 'https://ext.proweblook.com';

function createClientError(message, code, httpStatus = 400) {
	const err = new Error(message);
	err.code = code;
	err.httpStatus = httpStatus;
	return err;
}

async function fetchJsonWithTimeout(url, init = {}, fetchImpl = fetch, timeoutMs = 18000) {
	const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
	const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
	try {
		const res = await fetchImpl(url, controller ? { ...init, signal: controller.signal } : init);
		const data = await res.json().catch(() => null);
		return { status: res.status, ok: res.ok, data };
	} finally {
		if (timer) clearTimeout(timer);
	}
}

export async function validatePhone({
	phoneNumber,
	countryCode = '',
	apiKey,
	lookupBaseUrl = LOOKUP_BASE_URL,
	fetchImpl = fetch,
}) {
	const cleanKey = String(apiKey || '').trim();
	if (!cleanKey) throw createClientError('Missing ProWebLook API key', 'invalid_credentials', 401);

	const body = { api_key: cleanKey, phone_number: String(phoneNumber || '').trim() };
	if (countryCode && /^[A-Z]{2}$/i.test(countryCode.trim())) {
		body.country_code = countryCode.trim().toUpperCase();
	}

	const { status, ok, data } = await fetchJsonWithTimeout(
		`${lookupBaseUrl.replace(/\/+$/, '')}/phonevalidation`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify(body),
		},
		fetchImpl,
	);

	if (status === 401) throw createClientError('Invalid ProWebLook API key.', 'invalid_credentials', 401);
	if (status === 402) throw createClientError('Insufficient phone validation credits.', 'insufficient_credit', 402);
	if (!ok || !data) {
		throw createClientError(data?.error || `Phone validation HTTP ${status}`, 'provider_error', status || 502);
	}

	const payload = data.data && typeof data.data === 'object' ? data.data : data;
	const rawStatus = String(payload.status || '').toUpperCase();
	const verdict = rawStatus === 'VALID_CONFIRMED' ? 'valid' : rawStatus === 'INVALID' ? 'invalid' : 'unknown';
	const lineType = String(payload.linetype || payload.line_type || 'Unknown');
	const lowerLine = lineType.toLowerCase();
	const isVoip = lowerLine.includes('voip') || lowerLine.includes('virtual');
	const isLandline = lowerLine === 'fixed line' || lowerLine === 'landline';

	return {
		verdict,
		formattedNumber: payload.formatted_number || payload.formatinternational || body.phone_number,
		nationalFormat: payload.formatnational || '',
		lineType,
		isVoip,
		isLandline,
		carrier: payload.carrier || '',
		location: payload.location || '',
		countryCode: payload.countrycode || body.country_code || '',
		countryName: payload.countryname || '',
		timezone: Array.isArray(payload.timezone) ? payload.timezone[0] || '' : String(payload.timezone || ''),
	};
}

export async function checkWhatsapp({
	phoneNumber,
	countryCode = '',
	apiKey,
	lookupBaseUrl = LOOKUP_BASE_URL,
	fetchImpl = fetch,
}) {
	const cleanKey = String(apiKey || '').trim();
	if (!cleanKey) throw createClientError('Missing ProWebLook API key', 'invalid_credentials', 401);

	const body = { api_key: cleanKey, phone_number: String(phoneNumber || '').trim() };
	if (countryCode && /^[A-Z]{2}$/i.test(countryCode.trim())) {
		body.country_code = countryCode.trim().toUpperCase();
	}

	const { status, ok, data } = await fetchJsonWithTimeout(
		`${lookupBaseUrl.replace(/\/+$/, '')}/wavalidation`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify(body),
		},
		fetchImpl,
	);

	if (status === 401) throw createClientError('Invalid ProWebLook API key.', 'invalid_credentials', 401);
	if (status === 402) throw createClientError('Insufficient WhatsApp verification credits.', 'insufficient_credit', 402);
	if (!ok || !data) {
		throw createClientError(data?.error || `WhatsApp check HTTP ${status}`, 'provider_error', status || 502);
	}

	const payload = data.data && typeof data.data === 'object' ? data.data : data;
	const registered = payload.numberstatus === true || payload.registered === true;
	const isBusiness = payload.businessnumber === true || payload.is_business === true;
	return {
		verdict: registered ? 'on_whatsapp' : 'not_on_whatsapp',
		registered,
		isBusiness,
	};
}

export async function lookupCallerId({
	phoneNumber,
	apiKey,
	lookupBaseUrl = LOOKUP_BASE_URL,
	fetchImpl = fetch,
}) {
	const cleanKey = String(apiKey || '').trim();
	if (!cleanKey) throw createClientError('Missing ProWebLook API key', 'invalid_credentials', 401);

	const params = new URLSearchParams({
		api_key: cleanKey,
		phone_number: String(phoneNumber || '').trim(),
	});
	const { status, ok, data } = await fetchJsonWithTimeout(
		`${lookupBaseUrl.replace(/\/+$/, '')}/calleridvalidation?${params.toString()}`,
		{
			method: 'GET',
			headers: { Accept: 'application/json', 'X-API-KEY': cleanKey },
		},
		fetchImpl,
	);

	if (status === 401) throw createClientError('Invalid ProWebLook API key.', 'invalid_credentials', 401);
	if (status === 402) throw createClientError('Insufficient Caller ID credits.', 'insufficient_credit', 402);
	if (!ok || !data) {
		throw createClientError(data?.error || `Caller ID HTTP ${status}`, 'provider_error', status || 502);
	}

	const payload = data.data && typeof data.data === 'object' ? data.data : data;
	const callerName = String(payload.caller_name || payload.name || '').trim();
	return {
		verdict: callerName ? 'found' : payload.success === false ? 'invalid' : 'not_found',
		callerName,
		carrier: payload.carrier || '',
		lineType: payload.linetype || payload.line_type || '',
		location: payload.location || '',
		countryCode: payload.countrycode || '',
	};
}

export async function verifyEmail({
	email,
	apiKey,
	lookupBaseUrl = LOOKUP_BASE_URL,
	fetchImpl = fetch,
}) {
	const cleanKey = String(apiKey || '').trim();
	if (!cleanKey) throw createClientError('Missing ProWebLook API key', 'invalid_credentials', 401);

	const cleanEmail = String(email || '').trim().toLowerCase();
	const localDisposable = isDisposableEmailDomain(cleanEmail);
	const emailDomain = extractEmailDomain(cleanEmail);
	const isFreeWebmail = emailDomain ? FREE_WEBMAIL_DOMAINS.has(emailDomain) : false;

	const params = new URLSearchParams({ api_key: cleanKey, email: cleanEmail });
	const { status, ok, data } = await fetchJsonWithTimeout(
		`${lookupBaseUrl.replace(/\/+$/, '')}/emailvalidation?${params.toString()}`,
		{ method: 'GET', headers: { Accept: 'application/json' } },
		fetchImpl,
	);

	if (status === 401) throw createClientError('Invalid ProWebLook API key.', 'invalid_credentials', 401);
	if (status === 402) throw createClientError('Insufficient email verification credits.', 'insufficient_credit', 402);
	if (!ok || !data) {
		throw createClientError(data?.error || `Email verification HTTP ${status}`, 'provider_error', status || 502);
	}

	const payload = data.data && typeof data.data === 'object' ? data.data : data;
	const reasonCode = String(payload.reason_code || '');
	const isDisposable =
		localDisposable || reasonCode.toLowerCase().includes('disposable') || payload.disposable === true;

	let verdict = String(payload.verdict || '').toLowerCase();
	if (!['deliverable', 'undeliverable', 'unknown'].includes(verdict)) {
		if (payload.emailexist === false || payload.emailformat === false) {
			verdict = 'undeliverable';
		} else if (payload.emailexist === true) {
			verdict = 'deliverable';
		} else {
			verdict = 'unknown';
		}
	}

	return {
		email: cleanEmail,
		domain: emailDomain,
		verdict: isDisposable ? 'disposable' : verdict,
		isDisposable,
		isFreeWebmail,
		emailType: isDisposable ? 'disposable' : isFreeWebmail ? 'free_webmail' : 'corporate',
		reasonCode: reasonCode || (isDisposable ? 'disposable_domain' : 'completed'),
		emailFormatValid: payload.emailformat !== false,
		mailboxExists: payload.emailexist,
	};
}

export async function checkBlacklist({
	target,
	targetType = 'auto',
	apiKey,
	lookupBaseUrl = LOOKUP_BASE_URL,
	fetchImpl = fetch,
}) {
	const cleanKey = String(apiKey || '').trim();
	if (!cleanKey) throw createClientError('Missing ProWebLook API key', 'invalid_credentials', 401);

	const cleanTarget = String(target || '').trim();
	const params = new URLSearchParams({
		api_key: cleanKey,
		target: cleanTarget,
		target_type: ['ip', 'domain', 'url', 'auto'].includes(targetType) ? targetType : 'auto',
	});
	const { status, ok, data } = await fetchJsonWithTimeout(
		`${lookupBaseUrl.replace(/\/+$/, '')}/blacklistchecker?${params.toString()}`,
		{ method: 'GET', headers: { Accept: 'application/json' } },
		fetchImpl,
	);

	if (status === 401) throw createClientError('Invalid ProWebLook API key.', 'invalid_credentials', 401);
	if (status === 402) throw createClientError('Insufficient blacklist credits.', 'insufficient_credit', 402);
	if (!ok || !data) {
		throw createClientError(data?.error || `Blacklist HTTP ${status}`, 'provider_error', status || 502);
	}

	const payload = data.data && typeof data.data === 'object' ? data.data : data;
	const listedCount = Number(payload.listed_count ?? payload.listedCount ?? (payload.listed === true ? 1 : 0));
	return {
		target: cleanTarget,
		listed: listedCount > 0 || payload.listed === true,
		listedCount,
		checkedCount: Number(payload.total_checked || payload.sources_checked || 0),
	};
}

export async function lookupIpGeo({
	ip,
	apiKey,
	ipapiBaseUrl = IPAPI_BASE_URL,
	fetchImpl = fetch,
}) {
	const cleanKey = String(apiKey || '').trim();
	if (!cleanKey) throw createClientError('Missing ProWebLook API key', 'invalid_credentials', 401);

	const cleanIp = String(ip || '').trim();
	const params = new URLSearchParams({ api_key: cleanKey });
	if (cleanIp) params.set('ip', cleanIp);

	const { status, ok, data } = await fetchJsonWithTimeout(
		`${ipapiBaseUrl.replace(/\/+$/, '')}/?${params.toString()}`,
		{ method: 'GET', headers: { Accept: 'application/json' } },
		fetchImpl,
		10000,
	);

	if (!ok || !data) {
		throw createClientError(data?.error || `IP Geo HTTP ${status}`, 'provider_error', status || 502);
	}

	const payload = data.data && typeof data.data === 'object' ? data.data : data;
	const countryCode = String(payload.country_code || payload.countryCode || payload.country || '')
		.trim()
		.toUpperCase()
		.slice(0, 2);
	const isp = String(payload.isp || payload.org || payload.as_org || '');
	const asn = String(payload.asn || payload.as || '');
	const combinedOrg = `${isp} ${asn}`.toLowerCase();
	const isHostingOrProxy = HOSTING_PROXY_KEYWORDS.some((kw) => combinedOrg.includes(kw));

	return {
		ip: payload.ip || cleanIp,
		countryCode: /^[A-Z]{2}$/.test(countryCode) ? countryCode : '',
		countryName: payload.country_name || payload.country || '',
		region: payload.region || payload.region_name || '',
		city: payload.city || '',
		isp,
		asn,
		timezone: payload.timezone || '',
		isHostingOrProxy,
	};
}

export function scoreVerificationSignals({
	inputs = {},
	results = {},
	warnings = [],
	mode = 'api_key',
}) {
	let score = 62;
	const reasons = [];
	const positiveSignals = [];

	const phoneRes = results.phone || null;
	if (phoneRes) {
		if (phoneRes.verdict === 'valid') {
			if (phoneRes.isVoip) {
				score -= 18;
				reasons.push(`VoIP / virtual phone line (${phoneRes.carrier || phoneRes.lineType})`);
			} else {
				score += 14;
				positiveSignals.push(
					`Valid ${phoneRes.lineType || 'phone'}${phoneRes.carrier ? ` (${phoneRes.carrier})` : ''}`,
				);
			}
		} else if (phoneRes.verdict === 'invalid') {
			score -= 38;
			reasons.push('Invalid / disconnected phone number');
		}
	}

	const waRes = results.whatsapp || null;
	if (waRes) {
		if (waRes.registered) {
			score += 10;
			positiveSignals.push(waRes.isBusiness ? 'Active on WhatsApp Business' : 'Active on WhatsApp');
		} else if (phoneRes?.verdict === 'valid' && !phoneRes.isLandline) {
			score -= 4;
			reasons.push('Not registered on WhatsApp');
		}
	}

	const cnamRes = results.callerId || null;
	let callerNameMatch = 'not_checked';
	if (cnamRes) {
		callerNameMatch = compareCallerIdWithLead(cnamRes.callerName, inputs.contactName || '', '');
		if (cnamRes.callerName) {
			score += 8;
			if (callerNameMatch === 'matched') {
				score += 7;
				positiveSignals.push(`Caller ID matches contact (${cnamRes.callerName})`);
			} else if (callerNameMatch === 'mismatch') {
				score -= 14;
				reasons.push(`Caller ID registered to "${cnamRes.callerName}" (differs from input name)`);
			} else {
				positiveSignals.push(`Caller ID registered to "${cnamRes.callerName}"`);
			}
		}
	}

	const emailRes = results.email || null;
	if (emailRes) {
		if (emailRes.isDisposable || emailRes.verdict === 'disposable') {
			score -= 45;
			reasons.push(`Disposable temp-mail domain (${emailRes.domain || emailRes.email})`);
		} else if (emailRes.verdict === 'undeliverable') {
			score -= 35;
			reasons.push(`Undeliverable mailbox (${emailRes.reasonCode || 'bounces'})`);
		} else if (emailRes.verdict === 'deliverable') {
			if (emailRes.emailType === 'corporate') {
				score += 14;
				positiveSignals.push(`Deliverable corporate email (@${emailRes.domain})`);
			} else {
				score += 8;
				positiveSignals.push(`Deliverable personal email (@${emailRes.domain})`);
			}
		}
	}

	const blRes = results.domainBlacklist || null;
	if (blRes) {
		if (blRes.listed) {
			score -= 28;
			reasons.push(`${blRes.target} listed on ${blRes.listedCount} DNSBL blacklist(s)`);
		} else {
			score += 6;
			positiveSignals.push(`${blRes.target} clean across DNSBLs`);
		}
	}

	const ipRes = results.ipGeo || null;
	if (ipRes) {
		if (ipRes.isHostingOrProxy) {
			score -= 18;
			reasons.push(`Datacenter / VPN / hosting IP (${ipRes.isp || ipRes.ip})`);
		} else if (ipRes.countryCode && phoneRes?.countryCode && ipRes.countryCode !== phoneRes.countryCode) {
			score -= 10;
			reasons.push(`IP country (${ipRes.countryCode}) differs from phone country (${phoneRes.countryCode})`);
		} else if (ipRes.countryCode) {
			positiveSignals.push(`ISP IP in ${ipRes.city ? `${ipRes.city}, ` : ''}${ipRes.countryCode}`);
		}
	}

	const trustScore = Math.max(0, Math.min(100, Math.round(score)));
	const riskLevel = trustScore >= 72 ? 'trusted' : trustScore >= 45 ? 'review' : 'high_risk';
	const summaryParts = [...reasons, ...positiveSignals];
	const summary =
		summaryParts.length > 0 ? summaryParts.slice(0, 4).join(' · ') : 'Verification completed.';

	return {
		trustScore,
		riskLevel,
		summary,
		reasons,
		positiveSignals,
		warnings,
		mode,
		verifiedAt: new Date().toISOString(),
		inputs: {
			email: inputs.email || '',
			phoneNumber: inputs.phoneNumber || '',
			countryCode: inputs.countryCode || '',
			contactName: inputs.contactName || '',
			domain: inputs.domain || '',
			ipAddress: inputs.ipAddress || '',
		},
		signals: {
			phone: phoneRes,
			whatsapp: waRes,
			callerId: cnamRes ? { ...cnamRes, callerNameMatch } : null,
			email: emailRes,
			domainBlacklist: blRes,
			ipGeo: ipRes,
		},
	};
}

export async function runLeadVerification({
	email = '',
	phoneNumber = '',
	countryCode = '',
	contactName = '',
	domainOrIp = '',
	signalFlags = {},
	apiKey = '',
	installId = '',
	lookupBaseUrl = LOOKUP_BASE_URL,
	ipapiBaseUrl = IPAPI_BASE_URL,
	edgeBaseUrl = EDGE_SANDBOX_BASE_URL,
	fetchImpl = fetch,
}) {
	const cleanEmail = email ? normalizeEmailInput(email) || String(email).trim().toLowerCase() : '';
	const cleanPhone = phoneNumber ? normalizePhoneInput(phoneNumber) : '';
	const rawDomIp = String(domainOrIp || '').trim();
	const cleanIp = isValidIpAddress(rawDomIp) ? rawDomIp : '';
	const explicitDomain = !cleanIp && rawDomIp ? normalizeDomainInput(rawDomIp) : '';
	const emailDomain = extractEmailDomain(cleanEmail);
	const corporateDomain =
		explicitDomain ||
		(emailDomain && !FREE_WEBMAIL_DOMAINS.has(emailDomain) && !isDisposableEmailDomain(cleanEmail)
			? emailDomain
			: '');

	if (!cleanEmail && !cleanPhone && !corporateDomain && !cleanIp) {
		throw createClientError(
			'Enter an email address, phone number, domain, or IP address to verify.',
			'missing_lead_signals',
			400,
		);
	}

	const cleanKey = String(apiKey || '').trim();

	// Mode B: Zero-Signup Free Starter Sandbox via Edge Worker
	if (!cleanKey) {
		const { status, ok, data } = await fetchJsonWithTimeout(
			`${edgeBaseUrl.replace(/\/+$/, '')}/api/v1/trial-verify`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					'X-PWL-Install-Id': String(installId || 'anonymous'),
				},
				body: JSON.stringify({
					email: cleanEmail,
					phoneNumber: cleanPhone,
					countryCode: String(countryCode || '').trim().toUpperCase(),
					contactName: String(contactName || '').trim(),
					domain: corporateDomain,
					ipAddress: cleanIp,
					signalFlags,
				}),
			},
			fetchImpl,
			22000,
		);

		if (status === 429 || data?.code === 'sandbox_exhausted') {
			const err = createClientError(
				data?.error ||
					'Free Starter Sandbox (15 checks) used! Sign up free at proweblook.com for 50 free credits per tool and paste your API key in Settings.',
				'sandbox_exhausted',
				429,
			);
			err.sandbox = data?.sandbox || null;
			throw err;
		}
		if (!ok || !data || !data.report) {
			throw createClientError(
				data?.error || `Starter Sandbox HTTP ${status}. Connect your free ProWebLook API key in Settings.`,
				'provider_error',
				status || 502,
			);
		}
		return {
			report: data.report,
			sandbox: data.sandbox || null,
		};
	}

	// Mode A: Direct BYOK API Key calls
	const tasks = {};
	if (cleanPhone) {
		if (signalFlags.enablePhone !== false) {
			tasks.phone = validatePhone({
				phoneNumber: cleanPhone,
				countryCode,
				apiKey: cleanKey,
				lookupBaseUrl,
				fetchImpl,
			});
		}
		if (signalFlags.enableWhatsapp !== false) {
			tasks.whatsapp = checkWhatsapp({
				phoneNumber: cleanPhone,
				countryCode,
				apiKey: cleanKey,
				lookupBaseUrl,
				fetchImpl,
			});
		}
		if (signalFlags.enableCallerId !== false) {
			tasks.callerId = lookupCallerId({
				phoneNumber: cleanPhone,
				apiKey: cleanKey,
				lookupBaseUrl,
				fetchImpl,
			});
		}
	}

	if (cleanEmail && signalFlags.enableEmail !== false) {
		tasks.email = verifyEmail({
			email: cleanEmail,
			apiKey: cleanKey,
			lookupBaseUrl,
			fetchImpl,
		});
	}

	if (corporateDomain && signalFlags.enableDomainBlacklist !== false) {
		tasks.domainBlacklist = checkBlacklist({
			target: corporateDomain,
			targetType: 'domain',
			apiKey: cleanKey,
			lookupBaseUrl,
			fetchImpl,
		});
	}

	if (cleanIp && signalFlags.enableIpGeo !== false) {
		tasks.ipGeo = lookupIpGeo({
			ip: cleanIp,
			apiKey: cleanKey,
			ipapiBaseUrl,
			fetchImpl,
		});
	}

	const keys = Object.keys(tasks);
	if (keys.length === 0) {
		throw createClientError(
			'Enable at least one matching verification signal pill for your input.',
			'no_signals_enabled',
			400,
		);
	}

	const settled = await Promise.allSettled(keys.map((k) => tasks[k]));
	const results = {};
	const warnings = [];
	let fatalAuthError = null;

	keys.forEach((key, idx) => {
		const outcome = settled[idx];
		if (outcome.status === 'fulfilled') {
			results[key] = outcome.value;
		} else {
			const err = outcome.reason;
			if (err?.code === 'invalid_credentials') {
				fatalAuthError = err;
			} else {
				warnings.push(`${key}: ${err?.message || 'unavailable'}`);
			}
		}
	});

	if (fatalAuthError && Object.keys(results).length === 0) {
		throw fatalAuthError;
	}

	const report = scoreVerificationSignals({
		inputs: {
			email: cleanEmail,
			phoneNumber: cleanPhone,
			countryCode: String(countryCode || '').trim().toUpperCase(),
			contactName: String(contactName || '').trim(),
			domain: corporateDomain,
			ipAddress: cleanIp,
		},
		results,
		warnings,
		mode: 'api_key',
	});

	return { report, sandbox: null };
}

export async function getAccountBalances({
	apiKey,
	monolithBaseUrl = MONOLITH_BASE_URL,
	fetchImpl = fetch,
}) {
	const cleanKey = String(apiKey || '').trim();
	if (!cleanKey) throw createClientError('Enter your ProWebLook API key.', 'invalid_credentials', 401);

	const { status, ok, data } = await fetchJsonWithTimeout(
		`${monolithBaseUrl.replace(/\/+$/, '')}/zapier/get_balance`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${cleanKey}`,
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body: '{}',
		},
		fetchImpl,
		12000,
	);

	if (status === 401) {
		throw createClientError('Invalid ProWebLook API key.', 'invalid_credentials', 401);
	}
	if (ok && data?.ok && data?.data) {
		return {
			accountEmail: data.data.account_email || '',
			phone: data.data.phone?.amount ?? null,
			whatsapp: data.data.whatsapp?.amount ?? null,
			caller: data.data.caller?.amount ?? null,
			email: data.data.email?.amount ?? null,
			blacklist: data.data.blacklist?.amount ?? null,
		};
	}

	const fallback = await fetchJsonWithTimeout(
		`${monolithBaseUrl.replace(/\/+$/, '')}/checkbalance?api_key=${encodeURIComponent(cleanKey)}&service=phonevalidation`,
		{ method: 'GET', headers: { Accept: 'application/json' } },
		fetchImpl,
		10000,
	);
	if (fallback.status === 401 || fallback.data?.status === false) {
		throw createClientError('Invalid ProWebLook API key.', 'invalid_credentials', 401);
	}
	const bal = Number(fallback.data?.balance ?? 0);
	return {
		accountEmail: '',
		phone: Number.isFinite(bal) ? bal : null,
		whatsapp: null,
		caller: null,
		email: null,
		blacklist: null,
	};
}

export async function fetchSandboxStatus({
	installId,
	edgeBaseUrl = EDGE_SANDBOX_BASE_URL,
	fetchImpl = fetch,
}) {
	const { ok, data } = await fetchJsonWithTimeout(
		`${edgeBaseUrl.replace(/\/+$/, '')}/api/v1/trial-status`,
		{
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'X-PWL-Install-Id': String(installId || 'anonymous'),
			},
		},
		fetchImpl,
		8000,
	);
	if (ok && data?.sandbox) {
		return data.sandbox;
	}
	return null;
}
