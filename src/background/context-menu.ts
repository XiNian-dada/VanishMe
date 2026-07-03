import { getConfig, updateConfig, resetConfig } from '../shared/storage';
import { applyWebRTCPolicy, resetWebRTCPolicy } from './webrtc';
import { updateAcceptLanguageRule } from './dnr';

export function createContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'enable-globally',
      title: 'Enable globally',
      contexts: ['action']
    });

    chrome.contextMenus.create({
      id: 'disable-globally',
      title: 'Disable globally',
      contexts: ['action']
    });

    chrome.contextMenus.create({
      id: 'separator-1',
      type: 'separator',
      contexts: ['action']
    });

    chrome.contextMenus.create({
      id: 'enable-on-site',
      title: 'Enable on this site',
      contexts: ['action']
    });

    chrome.contextMenus.create({
      id: 'disable-on-site',
      title: 'Disable on this site',
      contexts: ['action']
    });

    chrome.contextMenus.create({
      id: 'separator-2',
      type: 'separator',
      contexts: ['action']
    });

    chrome.contextMenus.create({
      id: 'open-leak-test',
      title: 'Open leak test page',
      contexts: ['action']
    });

    chrome.contextMenus.create({
      id: 'reset-webrtc',
      title: 'Reset WebRTC policy',
      contexts: ['action']
    });
  });
}

export function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): void {
  switch (info.menuItemId) {
    case 'enable-globally':
      handleEnableGlobally();
      break;
    case 'disable-globally':
      handleDisableGlobally();
      break;
    case 'enable-on-site':
      if (tab?.url) handleEnableOnSite(tab.url, tab.id);
      break;
    case 'disable-on-site':
      if (tab?.url) handleDisableOnSite(tab.url, tab.id);
      break;
    case 'open-leak-test':
      handleOpenLeakTest();
      break;
    case 'reset-webrtc':
      handleResetWebRTC();
      break;
  }
}

async function handleEnableGlobally(): Promise<void> {
  const config = await updateConfig({ globalEnabled: true });
  await applyWebRTCPolicy(config);
  await updateAcceptLanguageRule(config);
}

async function handleDisableGlobally(): Promise<void> {
  const config = await updateConfig({ globalEnabled: false });
  await applyWebRTCPolicy(config);
  await updateAcceptLanguageRule(config);
}

async function handleEnableOnSite(url: string, tabId?: number): Promise<void> {
  try {
    const hostname = new URL(url).hostname;
    const config = await getConfig();
    config.siteRules[hostname] = { enabled: true };
    await updateConfig({ siteRules: config.siteRules });

    if (tabId) {
      chrome.tabs.reload(tabId);
    }
  } catch (error) {
    console.error('Failed to enable on site:', error);
  }
}

async function handleDisableOnSite(url: string, tabId?: number): Promise<void> {
  try {
    const hostname = new URL(url).hostname;
    const config = await getConfig();
    config.siteRules[hostname] = { enabled: false };
    await updateConfig({ siteRules: config.siteRules });

    if (tabId) {
      chrome.tabs.reload(tabId);
    }
  } catch (error) {
    console.error('Failed to disable on site:', error);
  }
}

function handleOpenLeakTest(): void {
  chrome.tabs.create({
    url: chrome.runtime.getURL('leak-test/leak-test.html')
  });
}

async function handleResetWebRTC(): Promise<void> {
  await resetWebRTCPolicy();
  const config = await getConfig();
  config.webrtc.enabled = false;
  config.webrtc.policy = 'default';
  await updateConfig(config);
}
