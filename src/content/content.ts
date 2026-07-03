import { getEffectiveConfigForUrl } from '../shared/storage';

async function injectScript(): Promise<void> {
  // Prevent duplicate injection
  if ((window as any).__BPG_CONTENT_INJECTED__) {
    return;
  }
  (window as any).__BPG_CONTENT_INJECTED__ = true;

  try {
    const config = await getEffectiveConfigForUrl(window.location.href);

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected/injected.js');
    script.type = 'module';

    // Pass config to injected script
    script.dataset.bpgConfig = JSON.stringify(config);

    (document.head || document.documentElement).appendChild(script);

    // Clean up after injection
    script.onload = () => {
      script.remove();
    };
  } catch (error) {
    console.error('VanishMe: Failed to inject script:', error);
  }
}

// Inject as early as possible
if (document.readyState === 'loading') {
  injectScript();
} else {
  injectScript();
}
