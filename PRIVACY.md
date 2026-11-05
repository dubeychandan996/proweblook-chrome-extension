# Privacy Policy — ProWebLook Chrome Extension

**Effective Date:** November 5, 2026  
**Publisher:** ProWebLook (https://proweblook.com · https://ext.proweblook.com)  
**Contact:** info@proweblook.com

## 1. Single Purpose & Minimal Permissions

**ProWebLook: Email, Phone & Domain Verifier** provides on-demand contact, phone carrier, silent WhatsApp, Caller ID (CNAM), email deliverability, DNSBL blacklist, and IP geolocation verification inside Chrome's Side Panel.

- **No passive browsing tracking:** The extension does **not** request `<all_urls>` host permissions and does **not** inject persistent content scripts across websites.
- **Explicit user gesture only (`activeTab`):** Webpage content is inspected solely when you explicitly click *Scan Active Webpage*, *+ From Tab*, or select *Verify with ProWebLook* from Chrome's right-click context menu.

## 2. Data Handled

- **Verification Queries:** Email addresses, phone numbers, contact/company names, domains, or IP addresses that you explicitly submit are sent over HTTPS (TLS 1.2+) to official ProWebLook API endpoints (`lookup.proweblook.com`, `proweblook.com`, `ipapi.proweblook.com`, and `ext.proweblook.com`) solely to return live verification signals.
- **Local Browser Storage (`chrome.storage.local`):** Your optional ProWebLook API key, signal preferences, 24-hour SHA-256 deduplication cache, and verification history vault are stored locally on your device. You can purge your cache/history or disconnect your API key in 1 click inside the extension.

## 3. Chrome Web Store Limited Use Disclosure

The use of information received from Google Chrome APIs adheres strictly to the **Chrome Web Store User Data Policy**, including the **Limited Use** requirements:

1. We never sell, rent, or transfer user data to third-party data brokers or advertisers.
2. We never use user data for personalized, retargeted, or behavioral advertising.
3. We never use user data to determine creditworthiness or lending eligibility.
4. We never collect browsing history, passwords, cookies, or unrelated personal communications.
