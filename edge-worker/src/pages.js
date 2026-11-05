const PAGE_SHELL_STYLE = `
	:root {
		--bg: #0b1120;
		--card: #111827;
		--border: #1f2a40;
		--text: #f8fafc;
		--muted: #94a3b8;
		--accent: #4f46e5;
		--sky: #38bdf8;
		--emerald: #10b981;
	}
	* { box-sizing: border-box; margin: 0; padding: 0; }
	body {
		background: var(--bg);
		color: var(--text);
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
		line-height: 1.65;
		padding: 0;
	}
	.wrap { max-width: 920px; margin: 0 auto; padding: 48px 24px 72px; }
	nav {
		display: flex; align-items: center; justify-content: space-between;
		padding: 18px 24px; border-bottom: 1px solid var(--border); background: rgba(17,24,39,0.85);
	}
	.brand { font-weight: 800; font-size: 18px; color: #fff; text-decoration: none; letter-spacing: -0.02em; }
	.nav-links { display: flex; gap: 18px; font-size: 14px; }
	.nav-links a { color: var(--muted); text-decoration: none; }
	.nav-links a:hover { color: #fff; }
	h1 { font-size: 36px; line-height: 1.2; letter-spacing: -0.02em; margin-bottom: 14px; }
	h2 { font-size: 21px; margin: 28px 0 10px; color: #fff; }
	p, li { color: var(--muted); font-size: 15.5px; }
	ul { padding-left: 22px; margin: 10px 0; }
	li { margin-bottom: 6px; }
	.hero-badge {
		display: inline-block; padding: 4px 12px; border-radius: 999px;
		background: rgba(79,70,229,0.2); border: 1px solid var(--accent);
		color: var(--sky); font-size: 12px; font-weight: 700; margin-bottom: 16px;
	}
	.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 28px; }
	.card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
	.card h3 { font-size: 16px; margin-bottom: 6px; color: #fff; }
	.cta-row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; }
	.btn {
		display: inline-block; padding: 11px 20px; border-radius: 9px; font-weight: 600;
		text-decoration: none; font-size: 14.5px;
	}
	.btn-primary { background: linear-gradient(135deg, #4f46e5, #2563eb); color: #fff; }
	.btn-outline { border: 1px solid var(--border); background: var(--card); color: #fff; }
	footer {
		border-top: 1px solid var(--border); padding: 28px 24px; text-align: center;
		color: var(--muted); font-size: 13.5px;
	}
	footer a { color: var(--sky); text-decoration: none; }
	code { background: rgba(56,189,248,0.12); color: var(--sky); padding: 2px 6px; border-radius: 5px; font-size: 13.5px; }
`;

function layout(title, bodyHtml) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>${title} — ProWebLook Chrome Extension</title>
	<style>${PAGE_SHELL_STYLE}</style>
</head>
<body>
	<nav>
		<a class="brand" href="/">ProWebLook · Chrome Side Panel</a>
		<div class="nav-links">
			<a href="/">Overview</a>
			<a href="/support">Support &amp; Setup</a>
			<a href="/privacy">Privacy Policy</a>
			<a href="/terms">Terms</a>
			<a href="https://proweblook.com" target="_blank" rel="noopener">ProWebLook.com ↗</a>
		</div>
	</nav>
	<div class="wrap">${bodyHtml}</div>
	<footer>
		&copy; 2026 ProWebLook (<a href="https://proweblook.com">proweblook.com</a>) · Contact: <a href="mailto:info@proweblook.com">info@proweblook.com</a> · <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms</a>
	</footer>
</body>
</html>`;
}

export function renderHomePage() {
	return layout(
		'Email, Phone, WhatsApp & Domain Verifier for Chrome',
		`
		<span class="hero-badge">OFFICIAL CHROME EXTENSION · MANIFEST V3 SIDE PANEL</span>
		<h1>Verify Emails, Phone Carriers, Silent WhatsApp, Caller ID &amp; Domains Right Inside Chrome</h1>
		<p>
			Built for sales teams, recruiters, fraud analysts, and developers. Inspect any lead, signature block, or webpage from Chrome's native Side Panel — with zero background tracking and zero <code>&lt;all_urls&gt;</code> permissions.
		</p>
		<div class="cta-row">
			<a class="btn btn-primary" href="https://proweblook.com/auth/signup?utm_source=ext_home">Get Free API Key (50 Credits / Tool)</a>
			<a class="btn btn-outline" href="/support">Setup &amp; Usage Guide</a>
		</div>
		<div class="grid">
			<div class="card">
				<h3>6-Signal Trust Score (0–100)</h3>
				<p>Combines Email Deliverability, Disposable Temp-Mail detection, Phone Carrier &amp; Line Type (Mobile/VoIP/Landline), Silent WhatsApp, Caller ID (CNAM), Domain DNSBL, and Edge GeoIP.</p>
			</div>
			<div class="card">
				<h3>1-Click Active Webpage Scan</h3>
				<p>Click <strong>Scan Active Webpage</strong> on any company contact page, LinkedIn profile, or CRM tab to extract emails, phone numbers, and domain reputation on demand.</p>
			</div>
			<div class="card">
				<h3>Right-Click Context Verification</h3>
				<p>Highlight any email address, international phone number, domain, or IP address on any website and choose <strong>Verify with ProWebLook</strong>.</p>
			</div>
			<div class="card">
				<h3>Privacy-First Architecture</h3>
				<p>Uses Chrome's user-invoked <code>activeTab</code> permission instead of broad host permissions. History, API keys, and 24h deduplication cache remain on your device.</p>
			</div>
		</div>
		`,
	);
}

export function renderPrivacyPage() {
	return layout(
		'Privacy Policy & Chrome Web Store Limited Use Disclosure',
		`
		<span class="hero-badge">CHROME WEB STORE USER DATA PRIVACY POLICY</span>
		<h1>Privacy Policy — ProWebLook Chrome Extension</h1>
		<p><strong>Effective Date:</strong> November 5, 2026 · <strong>Publisher:</strong> ProWebLook (<a href="https://proweblook.com" style="color:#38bdf8">https://proweblook.com</a>)</p>

		<h2>1. Single Purpose &amp; Minimal Permissions</h2>
		<p>
			<strong>ProWebLook: Email, Phone &amp; Domain Verifier</strong> has a single purpose: allowing users to verify contact emails, phone numbers (carrier, line type, silent WhatsApp, and Caller ID), domain blacklists (DNSBL), and IP geolocation from Chrome's Side Panel on explicit user request.
		</p>
		<ul>
			<li><strong>No passive browsing monitoring:</strong> The extension does <strong>not</strong> inject automatic content scripts across websites and does <strong>not</strong> request <code>&lt;all_urls&gt;</code> host permissions.</li>
			<li><strong>User-initiated <code>activeTab</code> access only:</strong> Webpage text is read strictly when you explicitly click <em>"Scan Active Webpage"</em>, <em>"+ From Tab"</em>, or invoke the right-click <em>"Verify with ProWebLook"</em> context menu.</li>
		</ul>

		<h2>2. What Data Is Processed</h2>
		<ul>
			<li><strong>Verification Inputs:</strong> Email addresses, phone numbers, contact/company names, domain names, or IP addresses that you type, paste, select via right-click menu, or explicitly scan from the active tab are transmitted over HTTPS (TLS 1.2+) to official ProWebLook endpoints (<code>lookup.proweblook.com</code>, <code>proweblook.com</code>, <code>ipapi.proweblook.com</code>, and <code>ext.proweblook.com</code>) solely to return real-time verification results.</li>
			<li><strong>Optional API Key &amp; Preferences:</strong> Your ProWebLook API key, preferences, 24-hour SHA-256 deduplication cache, and verification history are stored locally in your browser via <code>chrome.storage.local</code>. You can clear your cache and history vault or disconnect your API key at any time in the <strong>Settings</strong> and <strong>History</strong> tabs.</li>
			<li><strong>Starter Sandbox Quota Counter:</strong> When using the optional 15-lookup Free Starter Sandbox prior to connecting an API key, a random local installation identifier and client IP hash are used in Cloudflare KV for 30 days strictly to enforce fair-use rate limits.</li>
		</ul>

		<h2>3. Chrome Web Store Limited Use Compliance</h2>
		<p>
			ProWebLook's use and transfer of information received from Google Chrome APIs adheres strictly to the <strong>Chrome Web Store User Data Policy</strong>, including the <strong>Limited Use</strong> requirements:
		</p>
		<ul>
			<li>We <strong>never</strong> sell, rent, or trade user data or verification inputs to third parties, data brokers, or advertisers.</li>
			<li>We <strong>never</strong> use user data for personalized, retargeted, or interest-based advertising.</li>
			<li>We <strong>never</strong> use user data to determine creditworthiness or for lending purposes.</li>
			<li>We do <strong>not</strong> collect browsing history, keystrokes, passwords, financial payment details, or unrelated webpage content.</li>
		</ul>

		<h2>4. Data Retention &amp; Deletion</h2>
		<p>
			On-device history and cached lookups reside exclusively in your browser's <code>chrome.storage.local</code> storage and are deleted immediately when you click <strong>Clear</strong> in the extension or uninstall the extension. To request deletion of any account-linked API logs on ProWebLook, email <a href="mailto:info@proweblook.com" style="color:#38bdf8">info@proweblook.com</a>.
		</p>
		`,
	);
}

export function renderSupportPage() {
	return layout(
		'Setup & Support Guide',
		`
		<span class="hero-badge">QUICKSTART &amp; SUPPORT</span>
		<h1>Getting Started with ProWebLook for Chrome</h1>
		<h2>1. Instant Verification (Zero Signup Required)</h2>
		<p>Click the ProWebLook shield icon in Chrome's toolbar (or press <code>Alt+Shift+P</code>) to open the Side Panel. Every new installation includes <strong>15 free live Starter Sandbox checks</strong> immediately.</p>

		<h2>2. Smart Signature Paste &amp; Right-Click Menu</h2>
		<ul>
			<li><strong>Smart Paste:</strong> Paste a full email signature (e.g., <code>Alex Morgan · alex@stripe.com · +1 415 555 2671</code>) into the top Smart Paste bar to auto-fill Name, Email, Phone, and Corporate Domain in one step.</li>
			<li><strong>Right-Click Anywhere:</strong> Highlight any email, phone number, domain, or IP on any webpage, right-click, and select <strong>Verify with ProWebLook</strong>.</li>
			<li><strong>Scan Active Webpage:</strong> Open the <strong>Page Scan</strong> tab and click <strong>Scan Active Webpage</strong> to extract all visible <code>mailto:</code>, <code>tel:</code>, WhatsApp links, phone numbers, and domain reputation, with 1-click CSV export.</li>
		</ul>

		<h2>3. Connecting Your Free ProWebLook API Key</h2>
		<p>
			Sign up at <a href="https://proweblook.com/auth/signup" style="color:#38bdf8">proweblook.com/auth/signup</a> to receive <strong>50 free credits for each verification product</strong> plus <strong>20,000 free monthly Edge GeoIP lookups</strong>. Copy your API key from your ProWebLook dashboard and paste it into <strong>Settings → ProWebLook API Key</strong>.
		</p>

		<h2>4. Contact Support</h2>
		<p>Email our engineering support team anytime at <a href="mailto:info@proweblook.com" style="color:#38bdf8">info@proweblook.com</a> or visit <a href="https://proweblook.com/contact" style="color:#38bdf8">proweblook.com/contact</a>.</p>
		`,
	);
}

export function renderTermsPage() {
	return layout(
		'Terms of Service',
		`
		<span class="hero-badge">TERMS OF SERVICE</span>
		<h1>Terms of Service — ProWebLook Chrome Extension</h1>
		<p>By installing or using the ProWebLook Chrome Extension, you agree to use the service solely for lawful B2B contact verification, fraud prevention, deliverability hygiene, and cybersecurity investigation in compliance with applicable data protection laws (including GDPR, CCPA, and TCPA) and ProWebLook's full <a href="https://proweblook.com/terms" style="color:#38bdf8">Platform Terms of Service</a>.</p>
		<h2>Acceptable Use</h2>
		<ul>
			<li>Do not use the extension for unlawful harassment, stalking, spam distribution, or FCRA-regulated consumer credit/employment screening.</li>
			<li>Starter Sandbox quotas (15 checks per installation/network) are provided for evaluation; automated abuse or circumvention of sandbox quotas is prohibited.</li>
		</ul>
		`,
	);
}
