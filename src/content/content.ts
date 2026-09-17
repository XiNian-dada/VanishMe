// Domain matching logic (inlined to avoid code splitting)
function patternToRegex(pattern: string): RegExp {
  if (pattern === '*') {
    return /^.+$/i;
  }

  let escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

  if (escaped.startsWith('\\*\\.')) {
    const root = escaped.slice(4);
    return new RegExp(`^(?:.*\\.)?${root}$`, 'i');
  }

  escaped = escaped.replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

function matchDomain(domain: string, pattern: string): boolean {
  if (!domain || !pattern) return false;
  domain = domain.toLowerCase().trim();
  pattern = pattern.toLowerCase().trim();
  domain = domain.replace(/^https?:\/\//, '');
  pattern = pattern.replace(/^https?:\/\//, '');
  domain = domain.split(':')[0].split('/')[0];
  pattern = pattern.split(':')[0].split('/')[0];
  if (!pattern.includes('*')) {
    return domain === pattern;
  }
  const regex = patternToRegex(pattern);
  return regex.test(domain);
}

function matchDomainList(domain: string, patterns: string[]): boolean {
  if (!domain || !patterns || patterns.length === 0) return false;
  return patterns.some(pattern => matchDomain(domain, pattern));
}

function shouldEnableSpoofing(
  domain: string,
  matchMode: 'global' | 'whitelist' | 'blacklist',
  domainList: string[]
): boolean {
  if (!domain) return false;
  switch (matchMode) {
    case 'global':
      return true;
    case 'whitelist':
      return matchDomainList(domain, domainList);
    case 'blacklist':
      return !matchDomainList(domain, domainList);
    default:
      return false;
  }
}

// Inline the getEffectiveConfigForUrl function to avoid code splitting
async function getEffectiveConfigForUrl(url: string) {
  const { bpg_config } = await chrome.storage.local.get('bpg_config');
  if (!bpg_config) {
    return {
      globalEnabled: true,
      geolocation: { enabled: false },
      timezone: { enabled: false },
      language: { enabled: false },
      webrtc: { enabled: false }
    };
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = '';
  }

  // Check global enable switch
  if (!bpg_config.globalEnabled) {
    return {
      ...bpg_config,
      globalEnabled: false
    };
  }

  // Check match mode and domain list
  const matchEnabled = shouldEnableSpoofing(
    hostname,
    bpg_config.matchMode || 'global',
    bpg_config.domainList || []
  );

  // Check site-specific rules (highest priority)
  const siteRule = bpg_config.siteRules?.[hostname];
  const enabled = siteRule ? siteRule.enabled : matchEnabled;

  return {
    ...bpg_config,
    globalEnabled: enabled
  };
}

// Listen for config requests from injected script
window.addEventListener('message', async (event) => {
  if (event.source !== window || !event.data) return;

  if (event.data.type === '__VM_REQ__' || event.data.type === '__BPG_REQUEST_CONFIG__') {
    const nonce = event.data.nonce;
    const config = await getEffectiveConfigForUrl(window.location.href);
    const injectedConfig = {
      enabled: config.globalEnabled,
      debugMode: config.debugMode || false,
      geolocation: config.geolocation,
      timezone: config.timezone,
      language: config.language,
      canvas: config.canvas
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
      enabled: config.globalEnabled,
      debugMode: config.debugMode || false,
      geolocation: config.geolocation,
      timezone: config.timezone,
      language: config.language,
      canvas: config.canvas
    };

    window.postMessage({
      type: '__VM_UPDATE__',
      config: injectedConfig
    }, '*');
  }
});
