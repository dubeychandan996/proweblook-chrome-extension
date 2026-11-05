/**
 * ProWebLook Manifest V3 Background Service Worker.
 * - Opens Chrome Side Panel on toolbar icon click (`openPanelOnActionClick: true`)
 * - Registers right-click Context Menus for highlighted text, mailto:/tel: links, and active page scan
 * - Routes context-menu triggers cleanly to the Side Panel without broad host permissions
 */

import { setPendingQuery } from './src/storage.js';

const MENU_IDS = {
	VERIFY_SELECTION: 'pwl_verify_selection',
	VERIFY_LINK: 'pwl_verify_link',
	SCAN_PAGE: 'pwl_scan_active_page',
};

async function configureSidePanelAndMenus() {
	try {
		if (chrome.sidePanel?.setPanelBehavior) {
			await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
		}
	} catch (err) {
		console.warn('[ProWebLook] sidePanel behavior warning:', err);
	}

	chrome.contextMenus.removeAll(() => {
		chrome.contextMenus.create({
			id: MENU_IDS.VERIFY_SELECTION,
			title: 'Verify "%s" with ProWebLook',
			contexts: ['selection'],
		});

		chrome.contextMenus.create({
			id: MENU_IDS.VERIFY_LINK,
			title: 'Verify Contact / Domain Link with ProWebLook',
			contexts: ['link'],
		});

		chrome.contextMenus.create({
			id: MENU_IDS.SCAN_PAGE,
			title: 'Scan Current Page for Emails, Phones & Domain',
			contexts: ['page'],
		});
	});
}

chrome.runtime.onInstalled.addListener(() => {
	configureSidePanelAndMenus();
});

chrome.runtime.onStartup.addListener(() => {
	configureSidePanelAndMenus();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
	let payload = null;

	if (info.menuItemId === MENU_IDS.VERIFY_SELECTION && info.selectionText) {
		payload = {
			action: 'verify_raw',
			rawText: String(info.selectionText).trim().slice(0, 500),
		};
	} else if (info.menuItemId === MENU_IDS.VERIFY_LINK && info.linkUrl) {
		payload = {
			action: 'verify_raw',
			rawText: String(info.linkUrl).trim().slice(0, 500),
		};
	} else if (info.menuItemId === MENU_IDS.SCAN_PAGE) {
		payload = {
			action: 'scan_page',
			tabId: tab?.id || null,
		};
	}

	if (!payload) return;

	// Open the Side Panel synchronously/immediately on user gesture before awaiting storage
	const openPromise =
		tab?.id && chrome.sidePanel?.open
			? chrome.sidePanel.open({ tabId: tab.id }).catch(() => {})
			: Promise.resolve();

	await Promise.all([setPendingQuery(payload), openPromise]);

	// Notify Side Panel if it is already mounted
	chrome.runtime.sendMessage({ type: 'PWL_CONTEXT_TRIGGER', payload }).catch(() => {});
});
