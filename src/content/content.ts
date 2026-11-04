import { getEffectiveConfigForUrl } from '../shared/storage';

// Listen for config requests from injected script
window.addEventListener('message', async (event) => {
  if (event.source !== window || !event.data) return;

  if (event.data.type === '__VM_REQ__' || event.data.type === '__BPG_REQUEST_CONFIG__') {
    const nonce = event.data.nonce;
    const config = await getEffectiveConfigForUrl(window.location.href);
    const injectedConfig = {
      enabled: config.enabled,
      debugMode: config.debugMode || false,
      geolocation: config.geolocation,
      timezone: config.timezone,
      language: config.language,
      canvas: config.canvas,
      webrtc: config.webrtc
    };

    window.postMessage({
      type: '__VM_RES__',
      nonce,
      config: injectedConfig
    }, '*');

    window.postMessage({
      type: '__BPG_CONFIG_RESPONSE__',
      config: injectedConfig
    }, '*');
  }
});

// Forward storage updates to injected script
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local' && changes.bpg_config) {
    const config = await getEffectiveConfigForUrl(window.location.href);
    const injectedConfig = {
      enabled: config.enabled,
      debugMode: config.debugMode || false,
      geolocation: config.geolocation,
      timezone: config.timezone,
      language: config.language,
      canvas: config.canvas,
      webrtc: config.webrtc
    };

    window.postMessage({
      type: '__VM_UPDATE__',
      config: injectedConfig
    }, '*');
  }
});
