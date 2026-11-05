# ProWebLook: Email, Phone & Domain Verifier — Official Chrome Extension (Manifest V3)

Real-time **6-signal B2B contact, phone, WhatsApp, Caller ID (CNAM), email deliverability, DNSBL blacklist, and Edge IP geolocation** verification directly inside Google Chrome's native **Side Panel**.

- **Chrome Web Store Listing:** https://chromewebstore.google.com/detail/ojboimiofcfdcaiikaokafpioflmmjlg (`ojboimiofcfdcaiikaokafpioflmmjlg`)
- **Official Website:** https://ext.proweblook.com · https://proweblook.com
- **Privacy Policy (Chrome Web Store Limited Use):** https://ext.proweblook.com/privacy
- **API Documentation:** https://docs.proweblook.com/api-reference/

---

## Key Capabilities

1. **6-Signal Composite Trust Score (`0–100`)**
   - **Email Verification (`/api/v1/emailvalidation`):** Live MX/mailbox deliverability, corporate vs free webmail classification, and disposable temp-mail detection.
   - **Phone Carrier & Line Type (`/api/v1/phonevalidation`):** E.164 normalization, `Mobile` vs `VoIP` vs `Fixed Line`, carrier name, location, and timezone.
   - **Silent WhatsApp Validation (`/api/v1/wavalidation`):** Verifies personal & WhatsApp Business accounts silently without sending any OTP or message, plus 1-click `wa.me` chat link.
   - **Caller ID / CNAM Lookup (`/api/v1/calleridvalidation`):** Registered subscriber name lookup with automatic fuzzy comparison against the contact/company name.
   - **Domain Blacklist Audit (`/api/v1/blacklistchecker`):** Queries live DNSBL/RBL spam and malware databases.
   - **Edge IP Geolocation (`ipapi.proweblook.com`):** Sub-10ms country, city, ISP, ASN, and datacenter/VPN/proxy hosting detection.

2. **Smart Signature Paste & Right-Click Context Menu**
   - Paste an entire multi-line email signature into the **Smart Paste** bar to auto-populate `Name`, `Email`, `Phone`, and `Domain` simultaneously.
   - Highlight any email, phone number, domain, or IP on any webpage → right-click → **Verify with ProWebLook**.

3. **1-Click Active Webpage Lead Scanner (`activeTab`)**
   - Click **Scan Active Webpage** on any company site, LinkedIn profile, CRM record, or directory to extract visible emails, `mailto:`/`tel:`/WhatsApp links, phone numbers, public IPs, and social profiles — with batch verification and **1-Click CSV Export**.

4. **Privacy-First Minimal Permissions (Manifest V3)**
   - **Zero `<all_urls>` host permissions** and zero passive background content scripts.
   - Uses user-initiated `activeTab` + `sidePanel` + `contextMenus` + `storage`.
   - Includes a **15-check Zero-Signup Starter Sandbox** out of the box, plus BYOK ProWebLook API key support (**50 free credits per product** + **20,000 free monthly GeoIP requests** at [proweblook.com/auth/signup](https://proweblook.com/auth/signup)).

---

## Repository Structure

```text
extension/               # Pure Manifest V3 Chrome Extension (load unpacked or zip for CWS)
edge-worker/             # Cloudflare Worker serving https://ext.proweblook.com & Starter Sandbox
store-assets/            # 128x128 Store Icon, 1280x800 Screenshots, 440x280 & 1400x560 Promo Tiles
scripts/                 # Icon generator & Chrome Web Store .zip packager
test/                    # Automated Node.js unit & policy contract tests
```

## Development & Packaging

```bash
# Run unit & Chrome Web Store policy tests
npm test

# Generate extension icons (16, 32, 48, 128)
node scripts/generate-icons.mjs

# Build clean Manifest V3 Chrome Web Store package -> dist/proweblook-chrome-extension.zip
npm run zip
```

## Load Unpacked in Chrome

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select the `extension/` folder.
3. Click the **ProWebLook** icon in Chrome's toolbar (or press `Alt+Shift+P`) to open the Side Panel.
