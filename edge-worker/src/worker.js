import { runLeadVerification } from '../../extension/src/api-client.js';
import {
	renderHomePage,
	renderPrivacyPage,
	renderSupportPage,
	renderTermsPage,
} from './pages.js';

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Accept, X-PWL-Install-Id',
};

function jsonResponse(payload, status = 200) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			...CORS_HEADERS,
		},
	});
}

function htmlResponse(html, method = 'GET', status = 200) {
	return new Response(method === 'HEAD' ? null : html, {
		status,
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'public, max-age=300',
		},
	});
}

async function sha256Short(text) {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text || '')));
	return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0'))
		.join('')
		.slice(0, 24);
}

async function getSandboxBucketKey(request) {
	const installId = String(request.headers.get('X-PWL-Install-Id') || '').trim().slice(0, 64);
	const clientIp = String(request.headers.get('CF-Connecting-IP') || '0.0.0.0').trim();
	const ipHash = await sha256Short(`pwl_ext_ip:${clientIp}`);
	const idHash = installId ? await sha256Short(`pwl_ext_id:${installId}`) : ipHash;
	return { ipKey: `sb_ip:${ipHash}`, idKey: `sb_id:${idHash}` };
}

async function readSandboxQuota(kv, request, limit = 15) {
	if (!kv) return { used: 0, limit, remaining: limit, ipKey: '', idKey: '' };
	const { ipKey, idKey } = await getSandboxBucketKey(request);
	const [ipUsedRaw, idUsedRaw] = await Promise.all([kv.get(ipKey), kv.get(idKey)]);
	const used = Math.max(Number(ipUsedRaw || 0), Number(idUsedRaw || 0));
	return {
		used,
		limit,
		remaining: Math.max(0, limit - used),
		ipKey,
		idKey,
	};
}

async function incrementSandboxQuota(kv, quotaInfo) {
	const nextUsed = quotaInfo.used + 1;
	if (kv && quotaInfo.ipKey && quotaInfo.idKey) {
		const ttl = 30 * 24 * 3600;
		await Promise.all([
			kv.put(quotaInfo.ipKey, String(nextUsed), { expirationTtl: ttl }),
			kv.put(quotaInfo.idKey, String(nextUsed), { expirationTtl: ttl }),
		]);
	}
	return {
		used: nextUsed,
		limit: quotaInfo.limit,
		remaining: Math.max(0, quotaInfo.limit - nextUsed),
	};
}

export async function handleEdgeRequest(request, env = {}, fetchImpl = fetch) {
	const url = new URL(request.url);
	const path = url.pathname.replace(/\/+$/, '') || '/';
	const method = request.method.toUpperCase();
	const isGetOrHead = method === 'GET' || method === 'HEAD';

	if (method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: CORS_HEADERS });
	}

	if (isGetOrHead && path === '/health') {
		return jsonResponse({
			ok: true,
			service: 'proweblook-chrome-edge',
			version: '1.0.0',
			timestamp: new Date().toISOString(),
		});
	}

	if (isGetOrHead && path === '/') {
		return htmlResponse(renderHomePage(), method);
	}
	if (isGetOrHead && path === '/privacy') {
		return htmlResponse(renderPrivacyPage(), method);
	}
	if (isGetOrHead && (path === '/support' || path === '/setup')) {
		return htmlResponse(renderSupportPage(), method);
	}
	if (isGetOrHead && path === '/terms') {
		return htmlResponse(renderTermsPage(), method);
	}

	const limit = Math.max(1, Number(env.SANDBOX_LIMIT || 15));

	if (method === 'GET' && path === '/api/v1/trial-status') {
		const quota = await readSandboxQuota(env.PROWEBLOOK_CHROME_KV, request, limit);
		return jsonResponse({
			ok: true,
			sandbox: { used: quota.used, limit: quota.limit, remaining: quota.remaining },
		});
	}

	if (method === 'POST' && path === '/api/v1/trial-verify') {
		const starterKey = String(env.PROWEBLOOK_STARTER_API_KEY || '').trim();
		if (!starterKey) {
			return jsonResponse(
				{
					ok: false,
					code: 'starter_unavailable',
					error: 'Starter sandbox is temporarily unavailable. Connect your free ProWebLook API key in Settings.',
				},
				503,
			);
		}

		const quota = await readSandboxQuota(env.PROWEBLOOK_CHROME_KV, request, limit);
		if (quota.remaining <= 0) {
			return jsonResponse(
				{
					ok: false,
					code: 'sandbox_exhausted',
					error: `You've used all ${limit} free Starter Sandbox checks! Sign up free at proweblook.com for 50 free credits per product and paste your API key in Settings.`,
					sandbox: { used: quota.used, limit: quota.limit, remaining: 0 },
				},
				429,
			);
		}

		const body = await request.json().catch(() => null);
		if (!body || typeof body !== 'object') {
			return jsonResponse({ ok: false, error: 'Invalid JSON request body.' }, 400);
		}

		try {
			const { report } = await runLeadVerification({
				email: body.email || '',
				phoneNumber: body.phoneNumber || '',
				countryCode: body.countryCode || '',
				contactName: body.contactName || '',
				domainOrIp: body.ipAddress || body.domain || '',
				signalFlags: body.signalFlags || {},
				apiKey: starterKey,
				lookupBaseUrl: env.LOOKUP_BASE_URL || 'https://lookup.proweblook.com/api/v1',
				ipapiBaseUrl: env.IPAPI_BASE_URL || 'https://ipapi.proweblook.com',
				fetchImpl,
			});

			report.mode = 'sandbox';
			const updatedSandbox = await incrementSandboxQuota(env.PROWEBLOOK_CHROME_KV, quota);
			return jsonResponse({
				ok: true,
				report,
				sandbox: updatedSandbox,
			});
		} catch (err) {
			return jsonResponse(
				{
					ok: false,
					code: err?.code || 'verification_error',
					error: err?.message || 'Unable to complete verification.',
					sandbox: { used: quota.used, limit: quota.limit, remaining: quota.remaining },
				},
				err?.httpStatus && err.httpStatus >= 400 && err.httpStatus < 600 ? err.httpStatus : 400,
			);
		}
	}

	return jsonResponse({ ok: false, error: 'Not found' }, 404);
}

export default {
	async fetch(request, env) {
		return handleEdgeRequest(request, env);
	},
};
