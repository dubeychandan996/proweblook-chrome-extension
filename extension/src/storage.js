/**
 * On-Device Storage & Deduplication Vault (chrome.storage.local + Node test fallback).
 * Zero third-party cloud tracking — user API keys, history, and 24h cache stay local.
 */

const KEYS = {
	SETTINGS: 'pwl_settings_v1',
	HISTORY: 'pwl_history_v1',
	CACHE: 'pwl_cache_v1',
	INSTALL_ID: 'pwl_install_id_v1',
	PENDING_QUERY: 'pwl_pending_query_v1',
	SANDBOX_STATE: 'pwl_sandbox_state_v1',
};

export const DEFAULT_SETTINGS = {
	apiKey: '',
	defaultCountryCode: '',
	enableEmail: true,
	enablePhone: true,
	enableWhatsapp: true,
	enableCallerId: true,
	enableDomainBlacklist: true,
	enableIpGeo: true,
	cacheTtlHours: 24,
	theme: 'dark',
};

const MAX_HISTORY_ITEMS = 200;
const MAX_CACHE_ITEMS = 300;

const memoryFallback = new Map();

function getChromeStorageArea() {
	if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
		return chrome.storage.local;
	}
	return null;
}

export async function rawStorageGet(key) {
	const area = getChromeStorageArea();
	if (area) {
		const res = await area.get(key);
		return res ? res[key] : undefined;
	}
	return memoryFallback.get(key);
}

export async function rawStorageSet(key, value) {
	const area = getChromeStorageArea();
	if (area) {
		await area.set({ [key]: value });
		return;
	}
	memoryFallback.set(key, value);
}

export async function rawStorageRemove(key) {
	const area = getChromeStorageArea();
	if (area) {
		await area.remove(key);
		return;
	}
	memoryFallback.delete(key);
}

export async function getOrCreateInstallId() {
	let id = await rawStorageGet(KEYS.INSTALL_ID);
	if (typeof id === 'string' && id.length >= 16) {
		return id;
	}
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
	await rawStorageSet(KEYS.INSTALL_ID, id);
	return id;
}

export async function getSettings() {
	const saved = await rawStorageGet(KEYS.SETTINGS);
	return { ...DEFAULT_SETTINGS, ...(saved && typeof saved === 'object' ? saved : {}) };
}

export async function saveSettings(partial = {}) {
	const current = await getSettings();
	const next = { ...current, ...partial };
	if (typeof next.apiKey === 'string') {
		next.apiKey = next.apiKey.trim();
	}
	if (typeof next.defaultCountryCode === 'string') {
		next.defaultCountryCode = next.defaultCountryCode.trim().toUpperCase().slice(0, 2);
	}
	await rawStorageSet(KEYS.SETTINGS, next);
	return next;
}

export async function getSandboxState() {
	const saved = await rawStorageGet(KEYS.SANDBOX_STATE);
	return {
		used: Number(saved?.used || 0),
		limit: Number(saved?.limit || 15),
		remaining: Number(saved?.remaining ?? 15),
	};
}

export async function saveSandboxState(state = {}) {
	const current = await getSandboxState();
	const next = {
		used: Number.isFinite(Number(state.used)) ? Number(state.used) : current.used,
		limit: Number.isFinite(Number(state.limit)) ? Number(state.limit) : current.limit,
		remaining: Number.isFinite(Number(state.remaining))
			? Number(state.remaining)
			: Math.max(0, (Number(state.limit) || current.limit) - (Number(state.used) || current.used)),
	};
	await rawStorageSet(KEYS.SANDBOX_STATE, next);
	return next;
}

export async function computeLookupHash(inputs = {}, signalFlags = {}) {
	const canonical = JSON.stringify({
		e: String(inputs.email || '').trim().toLowerCase(),
		p: String(inputs.phoneNumber || '').trim(),
		c: String(inputs.countryCode || '').trim().toUpperCase(),
		n: String(inputs.contactName || '').trim().toLowerCase(),
		d: String(inputs.domain || '').trim().toLowerCase(),
		i: String(inputs.ipAddress || '').trim(),
		s: {
			em: Boolean(signalFlags.enableEmail),
			ph: Boolean(signalFlags.enablePhone),
			wa: Boolean(signalFlags.enableWhatsapp),
			cn: Boolean(signalFlags.enableCallerId),
			bl: Boolean(signalFlags.enableDomainBlacklist),
			ip: Boolean(signalFlags.enableIpGeo),
		},
	});
	const bytes = new TextEncoder().encode(canonical);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0'))
		.join('')
		.slice(0, 32);
}

export async function getCachedVerification(hash, ttlHours = 24) {
	if (!hash || ttlHours <= 0) return null;
	const store = (await rawStorageGet(KEYS.CACHE)) || {};
	const entry = store[hash];
	if (!entry || !entry.savedAt || !entry.report) return null;
	const maxAgeMs = ttlHours * 3600 * 1000;
	if (Date.now() - entry.savedAt > maxAgeMs) {
		return null;
	}
	return entry.report;
}

export async function setCachedVerification(hash, report) {
	if (!hash || !report) return;
	const store = (await rawStorageGet(KEYS.CACHE)) || {};
	store[hash] = { savedAt: Date.now(), report };

	const keys = Object.keys(store);
	if (keys.length > MAX_CACHE_ITEMS) {
		keys
			.sort((a, b) => (store[a]?.savedAt || 0) - (store[b]?.savedAt || 0))
			.slice(0, keys.length - MAX_CACHE_ITEMS)
			.forEach((k) => delete store[k]);
	}
	await rawStorageSet(KEYS.CACHE, store);
}

export async function clearVerificationCache() {
	await rawStorageRemove(KEYS.CACHE);
}

export async function getHistory() {
	const list = await rawStorageGet(KEYS.HISTORY);
	return Array.isArray(list) ? list : [];
}

export async function appendHistory(report) {
	if (!report) return [];
	const current = await getHistory();
	const id = report.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const entry = { ...report, id };
	const deduped = current.filter((item) => item.lookupHash !== report.lookupHash || !report.lookupHash);
	const next = [entry, ...deduped].slice(0, MAX_HISTORY_ITEMS);
	await rawStorageSet(KEYS.HISTORY, next);
	return next;
}

export async function clearHistory() {
	await rawStorageRemove(KEYS.HISTORY);
}

export async function setPendingQuery(payload) {
	await rawStorageSet(KEYS.PENDING_QUERY, {
		...payload,
		createdAt: Date.now(),
	});
}

export async function consumePendingQuery() {
	const pending = await rawStorageGet(KEYS.PENDING_QUERY);
	if (!pending) return null;
	await rawStorageRemove(KEYS.PENDING_QUERY);
	if (Date.now() - Number(pending.createdAt || 0) > 60_000) {
		return null;
	}
	return pending;
}
