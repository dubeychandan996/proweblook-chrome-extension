/**
 * ProWebLook Side Panel Controller (Manifest V3).
 * Zero inline event handlers, strict DOM escaping via textContent/createElement, CSP-compliant.
 */

import {
	fetchSandboxStatus,
	getAccountBalances,
	runLeadVerification,
} from './api-client.js';
import { extractPageLeadsInTab } from './content-extractor.js';
import {
	buildWhatsAppChatUrl,
	parseSmartContactInput,
	serializeRecordsToCsv,
} from './parser.js';
import {
	appendHistory,
	clearHistory,
	clearVerificationCache,
	computeLookupHash,
	consumePendingQuery,
	getCachedVerification,
	getHistory,
	getOrCreateInstallId,
	getSandboxState,
	getSettings,
	saveSandboxState,
	saveSettings,
	setCachedVerification,
} from './storage.js';

const state = {
	settings: null,
	installId: '',
	sandbox: { used: 0, limit: 15, remaining: 15 },
	currentReport: null,
	lastScan: null,
	scannedReports: [],
	history: [],
	historyFilter: 'all',
	historyQuery: '',
};

const $ = (id) => document.getElementById(id);

function showToast(msg) {
	const el = $('toastBar');
	if (!el) return;
	el.textContent = msg;
	el.classList.remove('hidden');
	clearTimeout(showToast._timer);
	showToast._timer = setTimeout(() => {
		el.classList.add('hidden');
	}, 2400);
}

function downloadCsvFile(filename, csvContent) {
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function switchTab(tabName) {
	document.querySelectorAll('.tab-btn').forEach((btn) => {
		const isMatch = btn.dataset.tab === tabName;
		btn.classList.toggle('active', isMatch);
		btn.setAttribute('aria-selected', String(isMatch));
	});
	document.querySelectorAll('.tab-panel').forEach((panel) => {
		panel.classList.toggle('active', panel.id === `tab-${tabName}`);
	});
}

function applyTheme(theme = 'dark') {
	const clean = theme === 'light' ? 'light' : 'dark';
	document.documentElement.setAttribute('data-theme', clean);
}

function updateTopModeBadge() {
	const badgeBtn = $('modeBadgeBtn');
	const badgeText = $('modeBadgeText');
	if (!badgeBtn || !badgeText) return;

	if (state.settings?.apiKey) {
		badgeBtn.classList.add('mode-connected');
		badgeText.textContent = 'API Connected';
	} else {
		badgeBtn.classList.remove('mode-connected');
		badgeText.textContent = `Starter · ${state.sandbox.remaining}/${state.sandbox.limit} free`;
	}
}

function updateSandboxUi() {
	const rem = Math.max(0, Number(state.sandbox.remaining ?? 15));
	const lim = Math.max(1, Number(state.sandbox.limit ?? 15));
	$('sandboxUsageLabel').textContent = `${rem} of ${lim} free live checks remaining`;
	$('sandboxPctLabel').textContent = rem > 0 ? 'Active' : 'Limit reached';
	$('sandboxProgressFill').style.width = `${Math.round((rem / lim) * 100)}%`;
	updateTopModeBadge();
}

function syncSignalChipsFromSettings() {
	document.querySelectorAll('.sig-chip').forEach((chip) => {
		const key = chip.dataset.sig;
		chip.classList.toggle('active', state.settings?.[key] !== false);
	});
}

function getActiveSignalFlags() {
	return {
		enableEmail: state.settings?.enableEmail !== false,
		enablePhone: state.settings?.enablePhone !== false,
		enableWhatsapp: state.settings?.enableWhatsapp !== false,
		enableCallerId: state.settings?.enableCallerId !== false,
		enableDomainBlacklist: state.settings?.enableDomainBlacklist !== false,
		enableIpGeo: state.settings?.enableIpGeo !== false,
	};
}

function createKvSpan(label, value) {
	const span = document.createElement('span');
	span.textContent = `${label}: `;
	const strong = document.createElement('strong');
	strong.textContent = value;
	span.appendChild(strong);
	return span;
}

function buildSignalCard(title, badgeText, badgeKind, kvPairs = [], actionLink = null) {
	const card = document.createElement('div');
	card.className = 'sig-detail-card';

	const top = document.createElement('div');
	top.className = 'sig-detail-top';

	const h = document.createElement('span');
	h.className = 'sig-detail-title';
	h.textContent = title;

	const pill = document.createElement('span');
	pill.className = `sig-pill pill-${badgeKind}`;
	pill.textContent = badgeText;

	top.append(h, pill);
	card.appendChild(top);

	if (kvPairs.length > 0) {
		const kvList = document.createElement('div');
		kvList.className = 'sig-kv-list';
		for (const [k, v] of kvPairs) {
			if (v !== undefined && v !== null && String(v).trim() !== '') {
				kvList.appendChild(createKvSpan(k, String(v)));
			}
		}
		card.appendChild(kvList);
	}

	if (actionLink) {
		const a = document.createElement('a');
		a.className = 'sig-inline-link';
		a.href = actionLink.href;
		a.target = '_blank';
		a.rel = 'noopener noreferrer';
		a.textContent = actionLink.label;
		card.appendChild(a);
	}

	return card;
}

function renderReport(report, fromCache = false) {
	state.currentReport = report;
	$('reportContainer').classList.remove('hidden');

	const score = Number(report.trustScore ?? 0);
	$('scoreValueText').textContent = String(score);
	const circumference = 226.2;
	const offset = circumference - (score / 100) * circumference;
	const arc = $('scoreProgressArc');
	arc.style.strokeDashoffset = String(offset.toFixed(1));
	arc.style.stroke = score >= 72 ? 'var(--emerald)' : score >= 45 ? 'var(--amber)' : 'var(--rose)';

	const riskBadge = $('riskTierBadge');
	const riskLevel = report.riskLevel || 'review';
	riskBadge.className = `verdict-badge verdict-${riskLevel}`;
	riskBadge.textContent =
		riskLevel === 'trusted' ? 'Trusted' : riskLevel === 'high_risk' ? 'High Risk' : 'Needs Review';

	$('cacheStatusTag').textContent = fromCache
		? '24h Cache · 0 credits'
		: report.mode === 'sandbox'
			? 'Starter Sandbox'
			: 'Live API';
	$('reportSummaryText').textContent = report.summary || 'Verification completed.';

	const grid = $('signalCardsGrid');
	grid.replaceChildren();
	const sig = report.signals || {};

	if (sig.email) {
		const v = sig.email.verdict;
		const kind = v === 'deliverable' ? 'good' : v === 'unknown' ? 'warn' : 'bad';
		grid.appendChild(
			buildSignalCard(
				'Email Deliverability',
				v.toUpperCase(),
				kind,
				[
					['Address', sig.email.email],
					['Type', sig.email.emailType === 'corporate' ? 'Corporate Domain' : sig.email.emailType],
					['Disposable', sig.email.isDisposable ? 'Yes (Burner)' : 'No'],
					['Reason', sig.email.reasonCode],
				],
			),
		);
	}

	if (sig.phone) {
		const isGood = sig.phone.verdict === 'valid' && !sig.phone.isVoip;
		const kind = isGood ? 'good' : sig.phone.verdict === 'valid' ? 'warn' : 'bad';
		grid.appendChild(
			buildSignalCard(
				'Phone Carrier & HLR',
				sig.phone.verdict === 'valid' ? sig.phone.lineType || 'Valid' : 'INVALID',
				kind,
				[
					['E.164', sig.phone.formattedNumber],
					['Carrier', sig.phone.carrier || 'Unknown'],
					['Country', sig.phone.countryName || sig.phone.countryCode],
					['Location', sig.phone.location],
					['Timezone', sig.phone.timezone],
				],
			),
		);
	}

	if (sig.whatsapp) {
		const label = sig.whatsapp.registered
			? sig.whatsapp.isBusiness
				? 'WA BUSINESS'
				: 'ON WHATSAPP'
			: 'NOT REGISTERED';
		const waHref = sig.whatsapp.registered
			? buildWhatsAppChatUrl(sig.phone?.formattedNumber || report.inputs?.phoneNumber || '')
			: '';
		grid.appendChild(
			buildSignalCard(
				'Silent WhatsApp Check',
				label,
				sig.whatsapp.registered ? 'good' : 'neutral',
				[
					['Reachable', sig.whatsapp.registered ? 'Yes (Silent Check)' : 'No'],
					['Account Type', sig.whatsapp.isBusiness ? 'Business Profile' : sig.whatsapp.registered ? 'Personal' : 'N/A'],
				],
				waHref ? { href: waHref, label: 'Open WhatsApp Chat (wa.me) →' } : null,
			),
		);
	}

	if (sig.callerId) {
		const match = sig.callerId.callerNameMatch;
		const kind = match === 'matched' ? 'good' : match === 'mismatch' ? 'warn' : sig.callerId.callerName ? 'good' : 'neutral';
		const badge =
			match === 'matched'
				? 'NAME MATCH'
				: match === 'mismatch'
					? 'NAME MISMATCH'
					: sig.callerId.callerName
						? 'REGISTERED'
						: 'UNLISTED';
		grid.appendChild(
			buildSignalCard(
				'Caller ID (CNAM)',
				badge,
				kind,
				[
					['Subscriber', sig.callerId.callerName || 'Unlisted'],
					['Network', sig.callerId.carrier],
					['Region', sig.callerId.location || sig.callerId.countryCode],
				],
			),
		);
	}

	if (sig.domainBlacklist) {
		const listed = sig.domainBlacklist.listed;
		grid.appendChild(
			buildSignalCard(
				'Domain DNSBL Reputation',
				listed ? `LISTED (${sig.domainBlacklist.listedCount})` : 'CLEAN',
				listed ? 'bad' : 'good',
				[
					['Domain', sig.domainBlacklist.target],
					['RBLs Checked', sig.domainBlacklist.checkedCount || 'Multi-RBL'],
				],
			),
		);
	}

	if (sig.ipGeo) {
		const risky = sig.ipGeo.isHostingOrProxy;
		grid.appendChild(
			buildSignalCard(
				'Edge IP Geolocation & ASN',
				risky ? 'DATACENTER / VPN' : 'ISP / CLEAN',
				risky ? 'warn' : 'good',
				[
					['IP', sig.ipGeo.ip],
					['Location', [sig.ipGeo.city, sig.ipGeo.region, sig.ipGeo.countryCode].filter(Boolean).join(', ')],
					['ISP / Org', sig.ipGeo.isp],
					['ASN', sig.ipGeo.asn],
				],
			),
		);
	}
}

async function executeVerification({ forceRefresh = false } = {}) {
	const errBox = $('verifyErrorBox');
	errBox.classList.add('hidden');

	const email = $('emailInput').value.trim();
	const phoneNumber = $('phoneInput').value.trim();
	const countryCode = $('countryInput').value || state.settings?.defaultCountryCode || '';
	const contactName = $('nameInput').value.trim();
	const domainOrIp = $('domainIpInput').value.trim();
	const signalFlags = getActiveSignalFlags();

	const hash = await computeLookupHash(
		{ email, phoneNumber, countryCode, contactName, domain: domainOrIp, ipAddress: domainOrIp },
		signalFlags,
	);

	if (!forceRefresh) {
		const cached = await getCachedVerification(hash, Number(state.settings?.cacheTtlHours ?? 24));
		if (cached) {
			renderReport(cached, true);
			return cached;
		}
	}

	$('verifyLoadingBox').classList.remove('hidden');
	$('verifySubmitBtn').disabled = true;

	try {
		const { report, sandbox } = await runLeadVerification({
			email,
			phoneNumber,
			countryCode,
			contactName,
			domainOrIp,
			signalFlags,
			apiKey: state.settings?.apiKey || '',
			installId: state.installId,
		});

		report.lookupHash = hash;
		await setCachedVerification(hash, report);
		state.history = await appendHistory(report);
		updateHistoryBadgeAndList();

		if (sandbox) {
			state.sandbox = await saveSandboxState(sandbox);
			updateSandboxUi();
		}

		renderReport(report, false);
		return report;
	} catch (err) {
		if (err?.sandbox) {
			state.sandbox = await saveSandboxState(err.sandbox);
			updateSandboxUi();
		}
		errBox.textContent = err?.message || 'Verification failed. Please check your input or API key.';
		errBox.classList.remove('hidden');
		return null;
	} finally {
		$('verifyLoadingBox').classList.add('hidden');
		$('verifySubmitBtn').disabled = false;
	}
}

function populateFormFromSmartText(rawText, autoRun = false) {
	const parsed = parseSmartContactInput(rawText);
	if (parsed.email) $('emailInput').value = parsed.email;
	if (parsed.phone) $('phoneInput').value = parsed.phone;
	if (parsed.contactName) $('nameInput').value = parsed.contactName;
	if (parsed.ip) {
		$('domainIpInput').value = parsed.ip;
	} else if (parsed.domain) {
		$('domainIpInput').value = parsed.domain;
	}

	if (autoRun && (parsed.email || parsed.phone || parsed.domain || parsed.ip)) {
		switchTab('verify');
		executeVerification({ forceRefresh: false });
	}
}

async function getActiveTab() {
	if (typeof chrome === 'undefined' || !chrome.tabs?.query) return null;
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	return tab || null;
}

async function runActivePageScan() {
	const errBox = $('scanErrorBox');
	errBox.classList.add('hidden');
	const container = $('scanResultsContainer');

	const tab = await getActiveTab();
	if (!tab || !tab.id || !tab.url || /^(chrome|edge|about|chrome-extension):/i.test(tab.url)) {
		errBox.textContent =
			'Switch to any regular http:// or https:// webpage (such as a company site, LinkedIn, or CRM tab) and click Scan Active Webpage.';
		errBox.classList.remove('hidden');
		return;
	}

	$('runPageScanBtn').disabled = true;
	$('runPageScanBtn').textContent = 'Scanning…';

	try {
		const [injection] = await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: extractPageLeadsInTab,
		});
		const scan = injection?.result;
		if (!scan) throw new Error('Unable to read active webpage content.');

		state.lastScan = scan;
		state.scannedReports = [];
		renderPageScanResults(scan);
	} catch (err) {
		errBox.textContent = err?.message || 'Could not scan this tab (restricted browser page).';
		errBox.classList.remove('hidden');
	} finally {
		$('runPageScanBtn').disabled = false;
		$('runPageScanBtn').textContent = 'Scan Active Webpage';
	}
}

function renderPageScanResults(scan) {
	const totalCount =
		(scan.emails?.length || 0) +
		(scan.phones?.length || 0) +
		(scan.ips?.length || 0) +
		(scan.pageDomain ? 1 : 0);

	const badge = $('scanCountBadge');
	badge.textContent = String(totalCount);
	badge.classList.toggle('hidden', totalCount === 0);

	$('scanPageHostTitle').textContent = scan.pageDomain
		? `${scan.pageDomain} (${totalCount} signals)`
		: 'Scanned Webpage';

	const hasVerifiableLeads = (scan.emails?.length || 0) + (scan.phones?.length || 0) > 0;
	$('batchVerifyBtn').classList.toggle('hidden', !hasVerifiableLeads);
	$('exportScanCsvBtn').classList.toggle('hidden', state.scannedReports.length === 0);

	const container = $('scanResultsContainer');
	container.replaceChildren();

	if (totalCount === 0 && (!scan.socials || scan.socials.length === 0)) {
		const empty = document.createElement('div');
		empty.className = 'empty-state';
		const t = document.createElement('div');
		t.className = 'empty-title';
		t.textContent = 'No public emails or phone numbers found on this page';
		const s = document.createElement('p');
		s.className = 'empty-sub';
		s.textContent = 'Try navigating to the Contact / About page or highlight any text and right-click → Verify with ProWebLook.';
		empty.append(t, s);
		container.appendChild(empty);
		return;
	}

	const addGroup = (groupTitle, items, renderItem) => {
		if (!items || items.length === 0) return;
		const group = document.createElement('div');
		group.className = 'scan-group-card';

		const hdr = document.createElement('div');
		hdr.className = 'scan-group-header';
		const k = document.createElement('span');
		k.className = 'section-kicker';
		k.textContent = `${groupTitle} (${items.length})`;
		hdr.appendChild(k);
		group.appendChild(hdr);

		items.forEach((item) => group.appendChild(renderItem(item)));
		container.appendChild(group);
	};

	if (scan.pageDomain) {
		addGroup('COMPANY DOMAIN', [scan.pageDomain], (dom) => {
			const row = document.createElement('div');
			row.className = 'scan-item-row';
			const main = document.createElement('div');
			main.className = 'scan-item-main';
			const v = document.createElement('div');
			v.className = 'scan-item-val';
			v.textContent = dom;
			const sub = document.createElement('div');
			sub.className = 'scan-item-sub';
			sub.textContent = scan.pageTitle || 'Active tab domain';
			main.append(v, sub);

			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'ghost-xs-btn';
			btn.textContent = 'Check DNSBL';
			btn.addEventListener('click', () => {
				$('emailInput').value = '';
				$('phoneInput').value = '';
				$('domainIpInput').value = dom;
				switchTab('verify');
				executeVerification();
			});
			row.append(main, btn);
			return row;
		});
	}

	addGroup('DISCOVERED EMAILS', scan.emails || [], (item) => {
		const row = document.createElement('div');
		row.className = 'scan-item-row';
		const main = document.createElement('div');
		main.className = 'scan-item-main';
		const v = document.createElement('div');
		v.className = 'scan-item-val';
		v.textContent = item.email;
		const sub = document.createElement('div');
		sub.className = 'scan-item-sub';
		sub.textContent = item.source === 'mailto' ? 'mailto: link' : 'Visible page text';
		main.append(v, sub);

		const actions = document.createElement('div');
		actions.className = 'scan-item-actions';
		const verifyBtn = document.createElement('button');
		verifyBtn.type = 'button';
		verifyBtn.className = 'ghost-xs-btn';
		verifyBtn.textContent = 'Verify';
		verifyBtn.addEventListener('click', () => {
			$('emailInput').value = item.email;
			$('domainIpInput').value = scan.pageDomain || '';
			switchTab('verify');
			executeVerification();
		});
		actions.appendChild(verifyBtn);
		row.append(main, actions);
		return row;
	});

	addGroup('DISCOVERED PHONE / WHATSAPP', scan.phones || [], (item) => {
		const row = document.createElement('div');
		row.className = 'scan-item-row';
		const main = document.createElement('div');
		main.className = 'scan-item-main';
		const v = document.createElement('div');
		v.className = 'scan-item-val';
		v.textContent = item.phone;
		const sub = document.createElement('div');
		sub.className = 'scan-item-sub';
		sub.textContent =
			item.source === 'whatsapp_link'
				? 'WhatsApp link'
				: item.source === 'tel_link'
					? 'tel: link'
					: item.context || 'Visible text';
		main.append(v, sub);

		const actions = document.createElement('div');
		actions.className = 'scan-item-actions';
		const verifyBtn = document.createElement('button');
		verifyBtn.type = 'button';
		verifyBtn.className = 'ghost-xs-btn';
		verifyBtn.textContent = 'Verify';
		verifyBtn.addEventListener('click', () => {
			$('phoneInput').value = item.phone;
			if (item.context && /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(item.context)) {
				$('nameInput').value = item.context;
			}
			switchTab('verify');
			executeVerification();
		});
		actions.appendChild(verifyBtn);
		row.append(main, actions);
		return row;
	});

	addGroup('PUBLIC IP ADDRESSES', scan.ips || [], (ip) => {
		const row = document.createElement('div');
		row.className = 'scan-item-row';
		const main = document.createElement('div');
		main.className = 'scan-item-main';
		const v = document.createElement('div');
		v.className = 'scan-item-val';
		v.textContent = ip;
		main.appendChild(v);

		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'ghost-xs-btn';
		btn.textContent = 'GeoIP';
		btn.addEventListener('click', () => {
			$('emailInput').value = '';
			$('phoneInput').value = '';
			$('domainIpInput').value = ip;
			switchTab('verify');
			executeVerification();
		});
		row.append(main, btn);
		return row;
	});

	addGroup('SOCIAL PROFILES', scan.socials || [], (socialUrl) => {
		const row = document.createElement('div');
		row.className = 'scan-item-row';
		const main = document.createElement('div');
		main.className = 'scan-item-main';
		const a = document.createElement('a');
		a.className = 'sig-inline-link';
		a.href = socialUrl;
		a.target = '_blank';
		a.rel = 'noopener noreferrer';
		a.textContent = socialUrl.replace(/^https?:\/\/(www\.)?/i, '');
		main.appendChild(a);
		row.appendChild(main);
		return row;
	});
}

async function runBatchScanVerification() {
	if (!state.lastScan) return;
	const candidates = [];
	for (const e of (state.lastScan.emails || []).slice(0, 3)) {
		candidates.push({ email: e.email, phoneNumber: '', domainOrIp: state.lastScan.pageDomain || '' });
	}
	for (const p of (state.lastScan.phones || []).slice(0, 2)) {
		candidates.push({ email: '', phoneNumber: p.phone, domainOrIp: '' });
	}
	if (candidates.length === 0) return;

	const btn = $('batchVerifyBtn');
	btn.disabled = true;
	const verifiedList = [];

	try {
		for (let i = 0; i < candidates.length; i++) {
			btn.textContent = `Verifying ${i + 1}/${candidates.length}…`;
			const c = candidates[i];
			const { report, sandbox } = await runLeadVerification({
				email: c.email,
				phoneNumber: c.phoneNumber,
				countryCode: state.settings?.defaultCountryCode || '',
				domainOrIp: c.domainOrIp,
				signalFlags: getActiveSignalFlags(),
				apiKey: state.settings?.apiKey || '',
				installId: state.installId,
			});
			verifiedList.push(report);
			state.history = await appendHistory(report);
			if (sandbox) {
				state.sandbox = await saveSandboxState(sandbox);
				updateSandboxUi();
			}
		}
		state.scannedReports = verifiedList;
		updateHistoryBadgeAndList();
		$('exportScanCsvBtn').classList.remove('hidden');
		showToast(`Verified ${verifiedList.length} page leads! Ready for CSV export.`);
	} catch (err) {
		showToast(err?.message || 'Batch verification stopped.');
	} finally {
		btn.disabled = false;
		btn.textContent = 'Verify Top 5';
	}
}

function updateHistoryBadgeAndList() {
	const countBadge = $('historyCountBadge');
	countBadge.textContent = String(state.history.length);
	countBadge.classList.toggle('hidden', state.history.length === 0);

	const container = $('historyListContainer');
	container.replaceChildren();

	const q = state.historyQuery.toLowerCase();
	const filtered = state.history.filter((item) => {
		if (state.historyFilter !== 'all' && item.riskLevel !== state.historyFilter) return false;
		if (!q) return true;
		const hay = [
			item.inputs?.email,
			item.inputs?.phoneNumber,
			item.inputs?.contactName,
			item.inputs?.domain,
			item.inputs?.ipAddress,
			item.signals?.callerId?.callerName,
			item.summary,
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
		return hay.includes(q);
	});

	if (filtered.length === 0) {
		const empty = document.createElement('div');
		empty.className = 'empty-state';
		const t = document.createElement('div');
		t.className = 'empty-title';
		t.textContent = state.history.length === 0 ? 'Verification vault is empty' : 'No matching history items';
		const s = document.createElement('p');
		s.className = 'empty-sub';
		s.textContent = 'Verified leads, phones, emails, and domains are stored locally on your device.';
		empty.append(t, s);
		container.appendChild(empty);
		return;
	}

	for (const rec of filtered) {
		const card = document.createElement('div');
		card.className = 'history-row-card';

		const top = document.createElement('div');
		top.className = 'history-row-top';

		const target = document.createElement('span');
		target.className = 'history-target';
		target.textContent =
			rec.inputs?.email ||
			rec.signals?.phone?.formattedNumber ||
			rec.inputs?.phoneNumber ||
			rec.inputs?.domain ||
			rec.inputs?.ipAddress ||
			'Lead Check';

		const badge = document.createElement('span');
		badge.className = `verdict-badge verdict-${rec.riskLevel || 'review'}`;
		badge.textContent = `${rec.trustScore ?? 0}/100`;

		top.append(target, badge);

		const sub = document.createElement('div');
		sub.className = 'history-sub';
		sub.textContent = rec.summary || '';

		const time = document.createElement('div');
		time.className = 'history-time';
		time.textContent = rec.verifiedAt ? new Date(rec.verifiedAt).toLocaleString() : '';

		card.append(top, sub, time);
		card.addEventListener('click', () => {
			$('emailInput').value = rec.inputs?.email || '';
			$('phoneInput').value = rec.inputs?.phoneNumber || '';
			$('nameInput').value = rec.inputs?.contactName || '';
			$('domainIpInput').value = rec.inputs?.ipAddress || rec.inputs?.domain || '';
			renderReport(rec, true);
			switchTab('verify');
		});
		container.appendChild(card);
	}
}

async function refreshAndRenderBalances(apiKey) {
	const balCard = $('balancesCard');
	const balGrid = $('balancesGrid');
	if (!apiKey) {
		balCard.classList.add('hidden');
		return;
	}

	const balances = await getAccountBalances({ apiKey });
	balCard.classList.remove('hidden');
	balGrid.replaceChildren();

	const entries = [
		['Phone HLR', balances.phone ?? '—'],
		['WhatsApp', balances.whatsapp ?? '—'],
		['Caller ID', balances.caller ?? '—'],
		['Email Verify', balances.email ?? '—'],
		['Blacklist', balances.blacklist ?? '—'],
		['Edge GeoIP', '20k/mo Free'],
	];

	for (const [label, val] of entries) {
		const tile = document.createElement('div');
		tile.className = 'bal-tile';
		const l = document.createElement('div');
		l.className = 'bal-label';
		l.textContent = label;
		const v = document.createElement('div');
		v.className = 'bal-val';
		v.textContent = String(val);
		tile.append(l, v);
		balGrid.appendChild(tile);
	}
}

async function handleContextPayload(payload) {
	if (!payload) return;
	if (payload.action === 'verify_raw' && payload.rawText) {
		$('smartPasteInput').value = payload.rawText;
		populateFormFromSmartText(payload.rawText, true);
	} else if (payload.action === 'scan_page') {
		switchTab('pagescan');
		await runActivePageScan();
	}
}

async function init() {
	state.installId = await getOrCreateInstallId();
	state.settings = await getSettings();
	state.sandbox = await getSandboxState();
	state.history = await getHistory();

	applyTheme(state.settings.theme);
	$('countryInput').value = state.settings.defaultCountryCode || '';
	$('defaultCountrySelect').value = state.settings.defaultCountryCode || '';
	$('cacheTtlSelect').value = String(state.settings.cacheTtlHours ?? 24);
	$('apiKeyInput').value = state.settings.apiKey || '';

	syncSignalChipsFromSettings();
	updateSandboxUi();
	updateHistoryBadgeAndList();

	if (state.settings.apiKey) {
		refreshAndRenderBalances(state.settings.apiKey).catch(() => {});
	} else {
		fetchSandboxStatus({ installId: state.installId })
			.then(async (sb) => {
				if (sb) {
					state.sandbox = await saveSandboxState(sb);
					updateSandboxUi();
				}
			})
			.catch(() => {});
	}

	// Wire Tabs
	document.querySelectorAll('.tab-btn').forEach((btn) => {
		btn.addEventListener('click', () => switchTab(btn.dataset.tab));
	});

	$('modeBadgeBtn').addEventListener('click', () => switchTab('settings'));

	$('themeToggleBtn').addEventListener('click', async () => {
		const nextTheme = state.settings.theme === 'light' ? 'dark' : 'light';
		state.settings = await saveSettings({ theme: nextTheme });
		applyTheme(nextTheme);
	});

	// Smart Paste auto-parser
	$('smartPasteInput').addEventListener('input', (e) => {
		const val = e.target.value.trim();
		if (val.length >= 4) {
			populateFormFromSmartText(val, false);
		}
	});

	$('fillFromTabBtn').addEventListener('click', async () => {
		const tab = await getActiveTab();
		if (!tab?.id || !tab.url || /^(chrome|edge|about|chrome-extension):/i.test(tab.url)) {
			showToast('Open a regular website tab first.');
			return;
		}
		try {
			const [inj] = await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				func: extractPageLeadsInTab,
			});
			const scan = inj?.result;
			if (scan) {
				if (scan.emails?.[0]) $('emailInput').value = scan.emails[0].email;
				if (scan.phones?.[0]) $('phoneInput').value = scan.phones[0].phone;
				if (scan.pageDomain) $('domainIpInput').value = scan.pageDomain;
				showToast('Populated signals from active tab!');
			}
		} catch (_) {
			showToast('Unable to inspect this browser tab.');
		}
	});

	$('useTabDomainBtn').addEventListener('click', async () => {
		const tab = await getActiveTab();
		if (tab?.url && /^https?:\/\//i.test(tab.url)) {
			const host = new URL(tab.url).hostname.replace(/^www\./i, '');
			$('domainIpInput').value = host;
		} else {
			showToast('Active tab has no public domain.');
		}
	});

	// Signal Chips
	document.querySelectorAll('.sig-chip').forEach((chip) => {
		chip.addEventListener('click', async () => {
			const key = chip.dataset.sig;
			const nextVal = !(state.settings?.[key] !== false);
			state.settings = await saveSettings({ [key]: nextVal });
			syncSignalChipsFromSettings();
		});
	});

	// Verify Form
	$('verifyForm').addEventListener('submit', (e) => {
		e.preventDefault();
		executeVerification({ forceRefresh: false });
	});

	$('clearFormBtn').addEventListener('click', () => {
		$('smartPasteInput').value = '';
		$('emailInput').value = '';
		$('phoneInput').value = '';
		$('nameInput').value = '';
		$('domainIpInput').value = '';
		$('verifyErrorBox').classList.add('hidden');
	});

	$('forceRefreshBtn').addEventListener('click', () => {
		executeVerification({ forceRefresh: true });
	});

	$('copyReportBtn').addEventListener('click', async () => {
		if (!state.currentReport) return;
		const r = state.currentReport;
		const lines = [
			`ProWebLook Trust Score: ${r.trustScore}/100 (${r.riskLevel.toUpperCase()})`,
			`Summary: ${r.summary}`,
			r.signals?.email ? `Email: ${r.signals.email.email} (${r.signals.email.verdict})` : '',
			r.signals?.phone ? `Phone: ${r.signals.phone.formattedNumber} (${r.signals.phone.lineType} · ${r.signals.phone.carrier})` : '',
			r.signals?.whatsapp ? `WhatsApp: ${r.signals.whatsapp.registered ? 'Registered' : 'Not registered'}` : '',
			r.signals?.callerId?.callerName ? `Caller ID: ${r.signals.callerId.callerName}` : '',
			r.signals?.domainBlacklist ? `Domain DNSBL: ${r.signals.domainBlacklist.target} (${r.signals.domainBlacklist.listed ? 'Listed' : 'Clean'})` : '',
		].filter(Boolean);
		await navigator.clipboard.writeText(lines.join('\n'));
		showToast('Copied summary to clipboard!');
	});

	$('copyJsonBtn').addEventListener('click', async () => {
		if (!state.currentReport) return;
		await navigator.clipboard.writeText(JSON.stringify(state.currentReport, null, 2));
		showToast('Copied JSON report!');
	});

	// Page Scan actions
	$('runPageScanBtn').addEventListener('click', runActivePageScan);
	$('batchVerifyBtn').addEventListener('click', runBatchScanVerification);
	$('exportScanCsvBtn').addEventListener('click', () => {
		if (!state.scannedReports.length) return;
		downloadCsvFile('proweblook-page-leads.csv', serializeRecordsToCsv(state.scannedReports));
	});

	// History actions
	$('historySearchInput').addEventListener('input', (e) => {
		state.historyQuery = e.target.value.trim();
		updateHistoryBadgeAndList();
	});

	document.querySelectorAll('.filter-pill').forEach((pill) => {
		pill.addEventListener('click', () => {
			document.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
			pill.classList.add('active');
			state.historyFilter = pill.dataset.filter;
			updateHistoryBadgeAndList();
		});
	});

	$('exportHistoryCsvBtn').addEventListener('click', () => {
		if (!state.history.length) {
			showToast('No history records to export yet.');
			return;
		}
		downloadCsvFile('proweblook-verification-history.csv', serializeRecordsToCsv(state.history));
	});

	$('clearHistoryBtn').addEventListener('click', async () => {
		await clearHistory();
		state.history = [];
		updateHistoryBadgeAndList();
		showToast('Cleared local history vault.');
	});

	// Settings actions
	$('saveApiKeyBtn').addEventListener('click', async () => {
		const key = $('apiKeyInput').value.trim();
		const msg = $('settingsStatusMsg');
		msg.classList.remove('hidden', 'err');
		if (!key) {
			msg.textContent = 'Paste a valid ProWebLook API key first.';
			msg.classList.add('err');
			return;
		}
		msg.textContent = 'Validating API key & loading credit pools…';
		try {
			await refreshAndRenderBalances(key);
			state.settings = await saveSettings({ apiKey: key });
			updateTopModeBadge();
			msg.textContent = 'API key verified and saved locally!';
			showToast('Connected ProWebLook API key!');
		} catch (err) {
			msg.textContent = err?.message || 'Invalid API key.';
			msg.classList.add('err');
		}
	});

	$('disconnectKeyBtn').addEventListener('click', async () => {
		$('apiKeyInput').value = '';
		state.settings = await saveSettings({ apiKey: '' });
		$('balancesCard').classList.add('hidden');
		$('settingsStatusMsg').classList.add('hidden');
		updateTopModeBadge();
		showToast('Switched back to Starter Sandbox mode.');
	});

	$('refreshBalancesBtn').addEventListener('click', () => {
		if (state.settings?.apiKey) {
			refreshAndRenderBalances(state.settings.apiKey)
				.then(() => showToast('Balances refreshed!'))
				.catch((e) => showToast(e?.message || 'Refresh failed.'));
		}
	});

	$('defaultCountrySelect').addEventListener('change', async (e) => {
		const val = e.target.value;
		state.settings = await saveSettings({ defaultCountryCode: val });
		$('countryInput').value = val;
	});

	$('cacheTtlSelect').addEventListener('change', async (e) => {
		state.settings = await saveSettings({ cacheTtlHours: Number(e.target.value) });
	});

	$('purgeCacheBtn').addEventListener('click', async () => {
		await clearVerificationCache();
		showToast('24h deduplication cache cleared.');
	});

	// Listen for Context Menu triggers while Side Panel is already open
	if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
		chrome.runtime.onMessage.addListener((message) => {
			if (message?.type === 'PWL_CONTEXT_TRIGGER') {
				consumePendingQuery().catch(() => {});
				handleContextPayload(message.payload);
			}
		});
	}

	// Check if Side Panel was just opened by a right-click Context Menu action
	const pending = await consumePendingQuery();
	if (pending) {
		await handleContextPayload(pending);
	}
}

init();
