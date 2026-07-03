import { getConfig } from '../shared/storage';
import { applyWebRTCPolicy } from './webrtc';
import { updateAcceptLanguageRule } from './dnr';
import { createContextMenus, handleContextMenuClick } from './context-menu';

chrome.runtime.onInstalled.addListener(async () => {
  console.log('VanishMe installed');

  const config = await getConfig();
  await applyWebRTCPolicy(config);
  await updateAcceptLanguageRule(config);

  createContextMenus();
});

chrome.runtime.onStartup.addListener(async () => {
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
