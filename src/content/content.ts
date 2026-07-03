// Inline the getEffectiveConfigForUrl function to avoid code splitting
async function getEffectiveConfigForUrl(url: string) {
  const { bpg_config } = await chrome.storage.local.get('bpg_config');
  if (!bpg_config) {
    // Return default config if none exists
    return {
      globalEnabled: true,
      geolocation: { enabled: false },
      timezone: { enabled: false },
      language: { enabled: false },
      webrtc: { enabled: false }
    };
  }

  // Check site-specific rules
  try {
    const hostname = new URL(url).hostname;
    const siteRule = bpg_config.siteRules?.[hostname];

    if (siteRule && siteRule.enabled === false) {
      // Site explicitly disabled
      return {
        ...bpg_config,
        globalEnabled: false
      };
    }
  } catch (error) {
    // Invalid URL, use global config
  }

  return bpg_config;
}

// Listen for config requests from injected script
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (event.data.type === '__BPG_REQUEST_CONFIG__') {
    const config = await getEffectiveConfigForUrl(window.location.href);
    const injectedConfig = {
      enabled: config.globalEnabled,
      geolocation: config.geolocation,
      timezone: config.timezone,
      language: config.language
    };

    window.postMessage({
      type: '__BPG_CONFIG_RESPONSE__',
      config: injectedConfig
    }, '*');
  }
});

// Inject script synchronously - it will request config via postMessage
function injectScriptSync(): void {
  if ((window as any).__BPG_CONTENT_INJECTED__) {
    return;
  }
  (window as any).__BPG_CONTENT_INJECTED__ = true;

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected/injected.js');
  (document.head || document.documentElement).appendChild(script);
}

// Inject immediately
injectScriptSync();
