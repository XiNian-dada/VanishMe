import { getConfig } from '../shared/storage';
import { applyWebRTCPolicy } from './webrtc';
import { updateAcceptLanguageRule } from './dnr';
import { createContextMenus, handleContextMenuClick } from './context-menu';
import { checkExitIP, ensureIPCheckAlarm } from './ip-sync';

// Service worker 可随时休眠；每次唤醒确认 alarm 存在，但不重置已有计时。
void ensureIPCheckAlarm().catch(error => console.error('Failed to schedule IP checks:', error));

chrome.runtime.onInstalled.addListener(async () => {
  console.log('VanishMe installed');
  void checkExitIP();

  const config = await getConfig();
  await applyWebRTCPolicy(config);
  await updateAcceptLanguageRule(config);

  createContextMenus();
});

chrome.runtime.onStartup.addListener(async () => {
  void checkExitIP();
  const config = await getConfig();
  await applyWebRTCPolicy(config);
  await updateAcceptLanguageRule(config);
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local' && changes.bpg_config) {
    const config = await getConfig();
    await applyWebRTCPolicy(config);
    await updateAcceptLanguageRule(config);
  }
});

chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
