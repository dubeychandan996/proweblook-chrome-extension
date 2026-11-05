/**
 * Generates HTML templates for all 6 Chrome Web Store promotional graphics:
 *  - screenshot-1-verify.png       (1280x800, 24-bit RGB PNG)
 *  - screenshot-2-pagescan.png     (1280x800, 24-bit RGB PNG)
 *  - screenshot-3-contextmenu.png  (1280x800, 24-bit RGB PNG)
 *  - screenshot-4-settings.png     (1280x800, 24-bit RGB PNG)
 *  - promo-small-440x280.png       (440x280,  24-bit RGB PNG)
 *  - promo-marquee-1400x560.png    (1400x560, 24-bit RGB PNG)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_HTML_DIR = path.join(ROOT, 'store-assets', '_templates');

fs.mkdirSync(OUT_HTML_DIR, { recursive: true });

const BASE_CSS = `
	* { box-sizing: border-box; margin: 0; padding: 0; }
	body {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
		background: radial-gradient(circle at 18% 15%, #1e293b 0%, #090d16 65%, #050811 100%);
		color: #f8fafc;
		overflow: hidden;
		-webkit-font-smoothing: antialiased;
	}
	.canvas-1280 {
		width: 1280px; height: 800px;
		display: flex; align-items: center; justify-content: space-between;
		padding: 46px 54px; gap: 40px; position: relative;
	}
	.glow-orb {
		position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.35; pointer-events: none;
	}
	.copy-col { width: 410px; flex-shrink: 0; z-index: 2; }
	.eyebrow {
		display: inline-flex; align-items: center; gap: 7px;
		padding: 5px 12px; border-radius: 999px;
		background: rgba(56, 189, 248, 0.14); border: 1px solid rgba(56, 189, 248, 0.35);
		color: #38bdf8; font-size: 12px; font-weight: 700; letter-spacing: 0.06em;
		text-transform: uppercase; margin-bottom: 18px;
	}
	.headline {
		font-size: 38px; font-weight: 800; line-height: 1.14; letter-spacing: -0.025em;
		margin-bottom: 16px; color: #ffffff;
	}
	.headline span {
		background: linear-gradient(90deg, #38bdf8, #818cf8, #34d399);
		-webkit-background-clip: text; -webkit-text-fill-color: transparent;
	}
	.subcopy { font-size: 16px; line-height: 1.55; color: #94a3b8; margin-bottom: 24px; }
	.bullet-list { display: flex; flex-direction: column; gap: 11px; list-style: none; }
	.bullet-list li {
		display: flex; align-items: center; gap: 10px; font-size: 14.5px; color: #e2e8f0; font-weight: 500;
	}
	.check-dot {
		width: 20px; height: 20px; border-radius: 6px;
		background: rgba(16, 185, 129, 0.18); border: 1px solid rgba(16, 185, 129, 0.45);
		color: #34d399; display: inline-flex; align-items: center; justify-content: center;
		font-size: 12px; font-weight: 800; flex-shrink: 0;
	}
	.browser-frame {
		flex: 1; height: 700px; background: #0f172a; border: 1px solid #26344d;
		border-radius: 16px; box-shadow: 0 28px 70px rgba(0,0,0,0.65);
		display: flex; flex-direction: column; overflow: hidden; z-index: 2;
	}
	.browser-bar {
		height: 42px; background: #162033; border-bottom: 1px solid #26344d;
		display: flex; align-items: center; padding: 0 14px; gap: 10px;
	}
	.traffic { display: flex; gap: 6px; }
	.traffic i { width: 10px; height: 10px; border-radius: 50%; display: block; }
	.url-pill {
		flex: 1; background: #0b1120; border: 1px solid #23304a; border-radius: 7px;
		padding: 5px 12px; font-size: 12px; color: #94a3b8; font-family: ui-monospace, Menlo, monospace;
	}
	.ext-pin {
		padding: 4px 10px; border-radius: 7px; background: linear-gradient(135deg, #4f46e5, #0ea5e9);
		color: #fff; font-size: 11px; font-weight: 700;
	}
	.browser-body { flex: 1; display: flex; overflow: hidden; }
	.webpage-pane {
		flex: 1; background: #f8fafc; color: #0f172a; padding: 24px; position: relative;
		display: flex; flex-direction: column; gap: 14px;
	}
	.sidepanel-pane {
		width: 365px; background: #0b1120; border-left: 1px solid #26344d;
		display: flex; flex-direction: column; color: #f8fafc;
	}
	.sp-header {
		padding: 11px 14px; background: #111827; border-bottom: 1px solid #1f2a40;
		display: flex; align-items: center; justify-content: space-between;
	}
	.sp-brand { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13.5px; }
	.sp-shield {
		width: 24px; height: 24px; border-radius: 6px;
		background: linear-gradient(135deg, #38bdf8, #4f46e5, #10b981);
		display: inline-flex; align-items: center; justify-content: center; color: #fff; font-size: 13px;
	}
	.sp-tabs {
		display: grid; grid-template-columns: repeat(4, 1fr); background: #111827;
		border-bottom: 1px solid #1f2a40; font-size: 11.5px; font-weight: 600; text-align: center;
	}
	.sp-tabs div { padding: 8px 4px; color: #94a3b8; border-bottom: 2px solid transparent; }
	.sp-tabs div.on { color: #fff; border-bottom-color: #4f46e5; }
	.sp-content { padding: 12px; display: flex; flex-direction: column; gap: 9px; flex: 1; }
	.sp-card { background: #111827; border: 1px solid #1f2a40; border-radius: 10px; padding: 10px 12px; }
	.pill {
		display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 700;
	}
	.pill-green { background: rgba(16,185,129,0.16); color: #34d399; }
	.pill-amber { background: rgba(245,158,11,0.16); color: #fbbf24; }
	.pill-red { background: rgba(244,63,94,0.16); color: #fb7185; }
	.pill-blue { background: rgba(56,189,248,0.16); color: #38bdf8; }
	.kv { font-size: 11.5px; color: #94a3b8; margin-top: 4px; line-height: 1.45; }
	.kv b { color: #f1f5f9; }
`;

const templates = [
	{
		name: 'screenshot-1-verify',
		width: 1280,
		height: 800,
		html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>
		<div class="canvas-1280">
			<div class="glow-orb" style="width:420px;height:420px;background:#4f46e5;top:-80px;left:-60px"></div>
			<div class="glow-orb" style="width:380px;height:380px;background:#10b981;bottom:-90px;right:40px"></div>
			<div class="copy-col">
				<div class="eyebrow">6-Signal Lead &amp; Fraud Guard</div>
				<h1 class="headline">Verify Emails, Phones &amp; <span>Caller ID</span> in Chrome</h1>
				<p class="subcopy">Inspect any B2B contact, inbound signup, or domain from Chrome's native Side Panel without leaving your workflow.</p>
				<ul class="bullet-list">
					<li><span class="check-dot">✓</span> Email Deliverability &amp; Burner Mail Shield</li>
					<li><span class="check-dot">✓</span> Phone Carrier &amp; Line Type (Mobile / VoIP)</li>
					<li><span class="check-dot">✓</span> Silent WhatsApp Personal &amp; Business Check</li>
					<li><span class="check-dot">✓</span> Registered Caller ID (CNAM) Name Match</li>
					<li><span class="check-dot">✓</span> Multi-RBL Domain Blacklist &amp; Edge GeoIP</li>
				</ul>
			</div>
			<div class="browser-frame">
				<div class="browser-bar">
					<div class="traffic"><i style="background:#ef4444"></i><i style="background:#f59e0b"></i><i style="background:#10b981"></i></div>
					<div class="url-pill">https://www.linkedin.com/in/alex-morgan-enterprise</div>
					<div class="ext-pin">✓ ProWebLook</div>
				</div>
				<div class="browser-body">
					<div class="webpage-pane">
						<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(15,23,42,0.04)">
							<div style="width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#0ea5e9);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;margin-bottom:12px">AM</div>
							<h3 style="font-size:20px;margin-bottom:4px">Alex Morgan</h3>
							<p style="color:#475569;font-size:13.5px;margin-bottom:12px">VP of Revenue Operations · CloudScale Systems</p>
							<div style="display:flex;flex-direction:column;gap:7px;font-size:12.5px;color:#334155;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0">
								<div><strong>Email:</strong> alex.morgan@cloudscale.io</div>
								<div><strong>Direct Mobile:</strong> +1 (415) 890-4412</div>
								<div><strong>Domain:</strong> cloudscale.io</div>
							</div>
						</div>
						<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px">
							<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">Smart Signature Paste</div>
							<p style="font-size:12.5px;color:#475569;line-height:1.5">Paste any multi-line email signature or CRM contact block to auto-fill Name, Email, Phone, and Corporate Domain simultaneously.</p>
						</div>
					</div>
					<div class="sidepanel-pane">
						<div class="sp-header">
							<div class="sp-brand"><span class="sp-shield">✓</span> ProWebLook</div>
							<span class="pill pill-green">API Connected</span>
						</div>
						<div class="sp-tabs"><div class="on">Verify</div><div>Page Scan</div><div>History</div><div>Settings</div></div>
						<div class="sp-content">
							<div class="sp-card" style="display:flex;align-items:center;gap:12px;background:#152036">
								<div style="width:64px;height:64px;border-radius:50%;border:5px solid #10b981;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0">
									<b style="font-size:20px;line-height:1">98</b><span style="font-size:9px;color:#94a3b8">/100</span>
								</div>
								<div>
									<div style="display:flex;gap:6px;margin-bottom:4px"><span class="pill pill-green">TRUSTED</span><span class="pill pill-blue">Live API</span></div>
									<div style="font-size:11px;color:#cbd5e1;line-height:1.35">Valid Mobile · Active on WhatsApp Business · Caller ID matches contact</div>
								</div>
							</div>
							<div class="sp-card">
								<div style="display:flex;justify-content:space-between"><b style="font-size:12px">Email Deliverability</b><span class="pill pill-green">DELIVERABLE</span></div>
								<div class="kv">Address: <b>alex.morgan@cloudscale.io</b> · Type: <b>Corporate</b> · Burner: <b>No</b></div>
							</div>
							<div class="sp-card">
								<div style="display:flex;justify-content:space-between"><b style="font-size:12px">Phone Carrier &amp; HLR</b><span class="pill pill-green">MOBILE</span></div>
								<div class="kv">E.164: <b>+14158904412</b> · Carrier: <b>AT&amp;T Mobility</b> · Region: <b>CA, US</b></div>
							</div>
							<div class="sp-card">
								<div style="display:flex;justify-content:space-between"><b style="font-size:12px">Silent WhatsApp Check</b><span class="pill pill-green">WA BUSINESS</span></div>
								<div class="kv">Reachable: <b>Yes (Silent Check)</b> · <span style="color:#38bdf8">Open wa.me Chat →</span></div>
							</div>
							<div class="sp-card">
								<div style="display:flex;justify-content:space-between"><b style="font-size:12px">Caller ID (CNAM)</b><span class="pill pill-green">NAME MATCH</span></div>
								<div class="kv">Subscriber: <b>MORGAN ALEX</b> · Domain DNSBL: <b>Clean (52 RBLs)</b></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div></body></html>`,
	},
	{
		name: 'screenshot-2-pagescan',
		width: 1280,
		height: 800,
		html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>
		<div class="canvas-1280">
			<div class="glow-orb" style="width:420px;height:420px;background:#0ea5e9;top:-70px;right:120px"></div>
			<div class="copy-col">
				<div class="eyebrow">1-Click Active Tab Scanner</div>
				<h1 class="headline">Extract &amp; Verify <span>Page Contacts</span> on Demand</h1>
				<p class="subcopy">Scan any company Contact page, directory, or CRM record with a single click — powered by user-invoked activeTab access.</p>
				<ul class="bullet-list">
					<li><span class="check-dot">✓</span> Finds mailto:, tel:, wa.me &amp; visible contacts</li>
					<li><span class="check-dot">✓</span> Filters out noisy assets &amp; dummy placeholders</li>
					<li><span class="check-dot">✓</span> Batch-verify top contacts in 1 click</li>
					<li><span class="check-dot">✓</span> Export enriched leads directly to CSV</li>
				</ul>
			</div>
			<div class="browser-frame">
				<div class="browser-bar">
					<div class="traffic"><i style="background:#ef4444"></i><i style="background:#f59e0b"></i><i style="background:#10b981"></i></div>
					<div class="url-pill">https://acmecloud.io/contact-sales</div>
					<div class="ext-pin">✓ ProWebLook</div>
				</div>
				<div class="browser-body">
					<div class="webpage-pane">
						<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:22px">
							<span style="font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase">Enterprise Sales &amp; Support</span>
							<h3 style="font-size:22px;margin:6px 0 10px">Talk to AcmeCloud Global</h3>
							<p style="font-size:13px;color:#475569;margin-bottom:16px">Reach our regional engineering &amp; sales desks directly by email, phone, or WhatsApp Business.</p>
							<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
								<div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-size:12px">
									<b>North America Desk</b><div style="margin-top:4px;color:#2563eb">enterprise@acmecloud.io</div><div style="color:#334155;margin-top:2px">+1 (650) 555-0194</div>
								</div>
								<div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-size:12px">
									<b>APAC &amp; India Desk</b><div style="margin-top:4px;color:#2563eb">apac@acmecloud.io</div><div style="color:#334155;margin-top:2px">+91 90386 55955</div>
								</div>
							</div>
						</div>
					</div>
					<div class="sidepanel-pane">
						<div class="sp-header">
							<div class="sp-brand"><span class="sp-shield">✓</span> ProWebLook</div>
							<span class="pill pill-blue">6 signals found</span>
						</div>
						<div class="sp-tabs"><div>Verify</div><div class="on">Page Scan</div><div>History</div><div>Settings</div></div>
						<div class="sp-content">
							<div class="sp-card" style="background:#152036">
								<div style="font-size:10px;color:#38bdf8;font-weight:700">ACTIVE WEBPAGE EXTRACTOR</div>
								<div style="font-size:14px;font-weight:700;margin:3px 0 8px">acmecloud.io (6 signals)</div>
								<div style="display:flex;gap:6px">
									<span style="flex:1;text-align:center;padding:6px;border-radius:7px;background:#4f46e5;font-size:11.5px;font-weight:700">Scan Active Webpage</span>
									<span style="padding:6px 9px;border-radius:7px;border:1px solid #334155;font-size:11px;font-weight:600">Verify Top 5</span>
									<span style="padding:6px 9px;border-radius:7px;border:1px solid #334155;font-size:11px;font-weight:600">CSV</span>
								</div>
							</div>
							<div class="sp-card">
								<div style="font-size:10px;color:#94a3b8;font-weight:700;margin-bottom:6px">COMPANY DOMAIN (1)</div>
								<div style="display:flex;justify-content:space-between;align-items:center">
									<div><b style="font-size:12px">acmecloud.io</b><div style="font-size:10.5px;color:#64748b">DNSBL Multi-RBL Check</div></div>
									<span class="pill pill-green">CLEAN</span>
								</div>
							</div>
							<div class="sp-card">
								<div style="font-size:10px;color:#94a3b8;font-weight:700;margin-bottom:6px">DISCOVERED EMAILS (2)</div>
								<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #1f2a40">
									<span style="font-size:12px;font-weight:600">enterprise@acmecloud.io</span><span class="pill pill-green">Deliverable</span>
								</div>
								<div style="display:flex;justify-content:space-between;align-items:center;padding-top:6px">
									<span style="font-size:12px;font-weight:600">apac@acmecloud.io</span><span class="pill pill-green">Deliverable</span>
								</div>
							</div>
							<div class="sp-card">
								<div style="font-size:10px;color:#94a3b8;font-weight:700;margin-bottom:6px">DISCOVERED PHONE / WHATSAPP (2)</div>
								<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #1f2a40">
									<span style="font-size:12px;font-weight:600">+16505550194</span><span class="pill pill-blue">Mobile · US</span>
								</div>
								<div style="display:flex;justify-content:space-between;align-items:center;padding-top:6px">
									<span style="font-size:12px;font-weight:600">+919038655955</span><span class="pill pill-green">WA Business</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div></body></html>`,
	},
	{
		name: 'screenshot-3-contextmenu',
		width: 1280,
		height: 800,
		html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>
		<div class="canvas-1280">
			<div class="glow-orb" style="width:420px;height:420px;background:#f43f5e;top:-70px;left:60px;opacity:0.25"></div>
			<div class="copy-col">
				<div class="eyebrow">Right-Click Fraud &amp; Risk Detection</div>
				<h1 class="headline">Catch <span>Burner Emails</span>, VoIP &amp; Spoofed Leads</h1>
				<p class="subcopy">Highlight any email, phone number, domain, or IP address anywhere on the web and right-click to expose risky signups immediately.</p>
				<ul class="bullet-list">
					<li><span class="check-dot">✓</span> Right-click "Verify with ProWebLook" menu</li>
					<li><span class="check-dot">✓</span> Flags disposable temp-mail &amp; virtual VoIP lines</li>
					<li><span class="check-dot">✓</span> Detects Caller ID vs Contact Name mismatches</li>
					<li><span class="check-dot">✓</span> Screens signup IPs for VPNs &amp; datacenters</li>
				</ul>
			</div>
			<div class="browser-frame">
				<div class="browser-bar">
					<div class="traffic"><i style="background:#ef4444"></i><i style="background:#f59e0b"></i><i style="background:#10b981"></i></div>
					<div class="url-pill">https://crm.example.com/inbound-leads/review</div>
					<div class="ext-pin">✓ ProWebLook</div>
				</div>
				<div class="browser-body">
					<div class="webpage-pane">
						<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;position:relative">
							<div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px">INBOUND DEMO REQUEST #4821</div>
							<div style="font-size:14px;font-weight:700;margin-bottom:8px">Submitted Contact: Jordan Blake</div>
							<div style="font-size:13px;color:#334155;line-height:1.7">
								<div>Email: <span style="background:#bfdbfe;padding:2px 5px;border-radius:4px;font-weight:600">jordan99@mailinator.com</span></div>
								<div>Phone: +1 (415) 555-0188</div>
								<div>Signup IP: 159.89.142.22</div>
							</div>
							<div style="margin-top:12px;width:275px;background:#1e293b;color:#f8fafc;border-radius:9px;padding:6px;box-shadow:0 16px 36px rgba(15,23,42,0.35);font-size:12px">
								<div style="padding:6px 10px;color:#94a3b8">Copy</div>
								<div style="padding:7px 10px;background:#4f46e5;border-radius:6px;font-weight:700;color:#fff">✓ Verify "jordan99@mailinator.com" with ProWebLook</div>
								<div style="padding:6px 10px;color:#cbd5e1">Scan Current Page for Emails &amp; Phones</div>
							</div>
						</div>
					</div>
					<div class="sidepanel-pane">
						<div class="sp-header">
							<div class="sp-brand"><span class="sp-shield">✓</span> ProWebLook</div>
							<span class="pill pill-red">Fraud Alert</span>
						</div>
						<div class="sp-tabs"><div class="on">Verify</div><div>Page Scan</div><div>History</div><div>Settings</div></div>
						<div class="sp-content">
							<div class="sp-card" style="display:flex;align-items:center;gap:12px;background:#231420;border-color:#4c1d2e">
								<div style="width:64px;height:64px;border-radius:50%;border:5px solid #f43f5e;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0">
									<b style="font-size:20px;line-height:1">12</b><span style="font-size:9px;color:#fda4af">/100</span>
								</div>
								<div>
									<div style="display:flex;gap:6px;margin-bottom:4px"><span class="pill pill-red">HIGH RISK</span><span class="pill pill-blue">Live API</span></div>
									<div style="font-size:11px;color:#fecdd3;line-height:1.35">Disposable temp-mail · VoIP virtual phone line · Datacenter VPN IP</div>
								</div>
							</div>
							<div class="sp-card">
								<div style="display:flex;justify-content:space-between"><b style="font-size:12px">Email Deliverability</b><span class="pill pill-red">DISPOSABLE</span></div>
								<div class="kv">Domain: <b>mailinator.com</b> · Temp-Mail Burner: <b>Detected</b></div>
							</div>
							<div class="sp-card">
								<div style="display:flex;justify-content:space-between"><b style="font-size:12px">Phone Carrier &amp; HLR</b><span class="pill pill-amber">VOIP LINE</span></div>
								<div class="kv">Line Type: <b>VoIP (Virtual)</b> · WhatsApp: <b>Not Registered</b></div>
							</div>
							<div class="sp-card">
								<div style="display:flex;justify-content:space-between"><b style="font-size:12px">Edge IP Geolocation</b><span class="pill pill-amber">DATACENTER / VPN</span></div>
								<div class="kv">IP: <b>159.89.142.22</b> · ASN: <b>DigitalOcean, LLC</b></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div></body></html>`,
	},
	{
		name: 'screenshot-4-settings',
		width: 1280,
		height: 800,
		html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>
		<div class="canvas-1280">
			<div class="glow-orb" style="width:420px;height:420px;background:#10b981;top:-60px;left:80px;opacity:0.25"></div>
			<div class="copy-col">
				<div class="eyebrow">Privacy-First &amp; Instant Sandbox</div>
				<h1 class="headline">Works Out of the Box — <span>Zero Broad Permissions</span></h1>
				<p class="subcopy">Start immediately with 15 free live Starter Sandbox checks, then connect your free ProWebLook API key for 50 free credits per tool.</p>
				<ul class="bullet-list">
					<li><span class="check-dot">✓</span> 15 Instant Starter Checks (No Login Needed)</li>
					<li><span class="check-dot">✓</span> 50 Free Credits / Product + 20k/mo Free GeoIP</li>
					<li><span class="check-dot">✓</span> 24-Hour Local SHA-256 Deduplication Cache</li>
					<li><span class="check-dot">✓</span> Zero &lt;all_urls&gt; Tracking · On-Device Vault</li>
				</ul>
			</div>
			<div class="browser-frame">
				<div class="browser-bar">
					<div class="traffic"><i style="background:#ef4444"></i><i style="background:#f59e0b"></i><i style="background:#10b981"></i></div>
					<div class="url-pill">https://proweblook.com/dashboard</div>
					<div class="ext-pin">✓ ProWebLook</div>
				</div>
				<div class="browser-body">
					<div class="webpage-pane" style="background:#0f172a;color:#f8fafc;justify-content:center;padding:34px">
						<div style="background:#111827;border:1px solid #1f2a40;border-radius:14px;padding:24px">
							<div style="font-size:11px;color:#38bdf8;font-weight:700;letter-spacing:0.06em;margin-bottom:8px">BUILT FOR PRIVACY &amp; SPEED</div>
							<h3 style="font-size:22px;margin-bottom:12px">Minimal Chrome Permissions</h3>
							<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12.5px;color:#94a3b8">
								<div style="padding:12px;background:#0b1120;border:1px solid #1f2a40;border-radius:9px"><b style="color:#fff;display:block;margin-bottom:4px">activeTab Only</b>Reads active page strictly when you click Scan or Verify.</div>
								<div style="padding:12px;background:#0b1120;border:1px solid #1f2a40;border-radius:9px"><b style="color:#fff;display:block;margin-bottom:4px">24h Smart Cache</b>Repeat checks return instantaneously and burn 0 credits.</div>
								<div style="padding:12px;background:#0b1120;border:1px solid #1f2a40;border-radius:9px"><b style="color:#fff;display:block;margin-bottom:4px">Local History Vault</b>Search, filter by risk tier, and export CSV anytime.</div>
								<div style="padding:12px;background:#0b1120;border:1px solid #1f2a40;border-radius:9px"><b style="color:#fff;display:block;margin-bottom:4px">Dark &amp; Light Themes</b>Crisp native Side Panel UI built for power users.</div>
							</div>
						</div>
					</div>
					<div class="sidepanel-pane">
						<div class="sp-header">
							<div class="sp-brand"><span class="sp-shield">✓</span> ProWebLook</div>
							<span class="pill pill-green">API Connected</span>
						</div>
						<div class="sp-tabs"><div>Verify</div><div>Page Scan</div><div>History</div><div class="on">Settings</div></div>
						<div class="sp-content">
							<div class="sp-card">
								<div style="font-size:10px;color:#94a3b8;font-weight:700;margin-bottom:6px">ZERO-SIGNUP STARTER SANDBOX</div>
								<div style="font-size:12px;font-weight:700;margin-bottom:6px">15 of 15 free live checks included</div>
								<div style="height:7px;border-radius:999px;background:#090e1a;overflow:hidden"><div style="width:100%;height:100%;background:linear-gradient(90deg,#38bdf8,#4f46e5,#10b981)"></div></div>
							</div>
							<div class="sp-card">
								<div style="font-size:10px;color:#94a3b8;font-weight:700;margin-bottom:8px">LIVE CREDIT POOL BALANCES</div>
								<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
									<div style="background:#172033;padding:8px;border-radius:8px"><div style="font-size:10px;color:#94a3b8">Phone HLR</div><b style="font-size:15px">2,450</b></div>
									<div style="background:#172033;padding:8px;border-radius:8px"><div style="font-size:10px;color:#94a3b8">WhatsApp</div><b style="font-size:15px">4,920</b></div>
									<div style="background:#172033;padding:8px;border-radius:8px"><div style="font-size:10px;color:#94a3b8">Caller ID</div><b style="font-size:15px">1,800</b></div>
									<div style="background:#172033;padding:8px;border-radius:8px"><div style="font-size:10px;color:#94a3b8">Email Verify</div><b style="font-size:15px">8,500</b></div>
									<div style="background:#172033;padding:8px;border-radius:8px"><div style="font-size:10px;color:#94a3b8">Blacklist</div><b style="font-size:15px">1,200</b></div>
									<div style="background:#172033;padding:8px;border-radius:8px"><div style="font-size:10px;color:#94a3b8">Edge GeoIP</div><b style="font-size:14px;color:#34d399">20k/mo Free</b></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div></body></html>`,
	},
	{
		name: 'promo-small-440x280',
		width: 440,
		height: 280,
		html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}
			.tile-440 {
				width: 440px; height: 280px; padding: 26px 28px;
				display: flex; flex-direction: column; justify-content: space-between;
				background: radial-gradient(circle at 85% 20%, #312e81 0%, #0b1120 65%, #060a14 100%);
				position: relative; overflow: hidden;
			}
		</style></head><body>
		<div class="tile-440">
			<div style="display:flex;align-items:center;justify-content:space-between">
				<div style="display:flex;align-items:center;gap:10px">
					<div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#38bdf8,#4f46e5,#10b981);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;color:#fff">✓</div>
					<span style="font-weight:800;font-size:18px;letter-spacing:-0.02em">ProWebLook</span>
				</div>
				<span class="pill pill-green" style="font-size:11px;padding:3px 9px">Side Panel</span>
			</div>
			<div>
				<div style="font-size:25px;font-weight:800;line-height:1.18;letter-spacing:-0.02em;margin-bottom:8px">
					Email, Phone, WhatsApp &amp; Caller ID Verifier
				</div>
				<div style="font-size:13px;color:#94a3b8">
					6-signal B2B lead trust score, DNSBL &amp; GeoIP right inside Chrome.
				</div>
			</div>
			<div style="display:flex;gap:6px">
				<span class="pill pill-blue">Email</span>
				<span class="pill pill-green">WhatsApp</span>
				<span class="pill pill-blue">Caller ID</span>
				<span class="pill pill-green">DNSBL</span>
			</div>
		</div></body></html>`,
	},
	{
		name: 'promo-marquee-1400x560',
		width: 1400,
		height: 560,
		html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}
			.marquee-1400 {
				width: 1400px; height: 560px; padding: 56px 76px;
				display: flex; align-items: center; justify-content: space-between; gap: 56px;
				background: radial-gradient(circle at 75% 25%, #1e1b4b 0%, #0b1120 60%, #050811 100%);
				position: relative; overflow: hidden;
			}
		</style></head><body>
		<div class="marquee-1400">
			<div style="max-width:650px;z-index:2">
				<div class="eyebrow">ProWebLook Official Chrome Extension</div>
				<h1 style="font-size:50px;font-weight:800;line-height:1.12;letter-spacing:-0.03em;margin-bottom:18px">
					Real-Time <span style="background:linear-gradient(90deg,#38bdf8,#818cf8,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Email, Phone, WhatsApp &amp; Caller ID</span> Intelligence
				</h1>
				<p style="font-size:19px;color:#94a3b8;line-height:1.5;margin-bottom:26px">
					Verify contacts, extract page leads, detect burner emails &amp; VoIP numbers, and audit domain blacklists directly from Chrome's Side Panel.
				</p>
				<div style="display:flex;gap:10px;flex-wrap:wrap">
					<span class="pill pill-green" style="font-size:13px;padding:6px 14px">✓ Email &amp; Temp-Mail</span>
					<span class="pill pill-blue" style="font-size:13px;padding:6px 14px">✓ Carrier &amp; Line Type</span>
					<span class="pill pill-green" style="font-size:13px;padding:6px 14px">✓ Silent WhatsApp</span>
					<span class="pill pill-blue" style="font-size:13px;padding:6px 14px">✓ Caller ID (CNAM)</span>
					<span class="pill pill-green" style="font-size:13px;padding:6px 14px">✓ Domain DNSBL &amp; GeoIP</span>
				</div>
			</div>
			<div style="width:520px;background:#111827;border:1px solid #283652;border-radius:18px;padding:24px;box-shadow:0 28px 70px rgba(0,0,0,0.6);z-index:2">
				<div style="display:flex;align-items:center;gap:16px;padding-bottom:18px;border-bottom:1px solid #1f2a40;margin-bottom:16px">
					<div style="width:78px;height:78px;border-radius:50%;border:6px solid #10b981;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0">
						<b style="font-size:26px;line-height:1">98</b><span style="font-size:11px;color:#94a3b8">/100</span>
					</div>
					<div>
						<span class="pill pill-green" style="font-size:12px;margin-bottom:6px">TRUSTED B2B LEAD</span>
						<div style="font-size:14px;color:#e2e8f0;font-weight:600">alex.morgan@cloudscale.io · +1 (415) 890-4412</div>
						<div style="font-size:12.5px;color:#94a3b8;margin-top:3px">Valid Mobile · Active on WhatsApp Business · CNAM Verified</div>
					</div>
				</div>
				<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12.5px">
					<div style="background:#172033;padding:12px;border-radius:10px"><div style="color:#94a3b8;font-size:11px">EMAIL</div><b style="color:#34d399">Deliverable Corporate</b></div>
					<div style="background:#172033;padding:12px;border-radius:10px"><div style="color:#94a3b8;font-size:11px">CARRIER HLR</div><b style="color:#38bdf8">AT&amp;T Mobility (Mobile)</b></div>
					<div style="background:#172033;padding:12px;border-radius:10px"><div style="color:#94a3b8;font-size:11px">SILENT WHATSAPP</div><b style="color:#34d399">Registered Business</b></div>
					<div style="background:#172033;padding:12px;border-radius:10px"><div style="color:#94a3b8;font-size:11px">DOMAIN DNSBL</div><b style="color:#34d399">Clean (0 / 52 RBLs)</b></div>
				</div>
			</div>
		</div></body></html>`,
	},
];

for (const tpl of templates) {
	fs.writeFileSync(path.join(OUT_HTML_DIR, `${tpl.name}.html`), tpl.html);
}
console.log(`Wrote ${templates.length} store asset HTML templates to ${OUT_HTML_DIR}`);
