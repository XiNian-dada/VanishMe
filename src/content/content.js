"use strict";
// Domain matching logic (inlined to avoid code splitting)
function patternToRegex(pattern) {
    let regexStr = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
    regexStr = '^' + regexStr + '$';
    return new RegExp(regexStr, 'i');
}
function matchDomain(domain, pattern) {
    if (!domain || !pattern)
        return false;
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
function matchDomainList(domain, patterns) {
    if (!domain || !patterns || patterns.length === 0)
        return false;
    return patterns.some(pattern => matchDomain(domain, pattern));
}
function shouldEnableSpoofing(domain, matchMode, domainList) {
    if (!domain)
        return false;
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
async function getEffectiveConfigForUrl(url) {
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
    let hostname;
    try {
        hostname = new URL(url).hostname;
    }
    catch {
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
    const matchEnabled = shouldEnableSpoofing(hostname, bpg_config.matchMode || 'global', bpg_config.domainList || []);
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
    if (event.source !== window)
        return;
    if (event.data.type === '__BPG_REQUEST_CONFIG__') {
        const config = await getEffectiveConfigForUrl(window.location.href);
        const injectedConfig = {
            enabled: config.globalEnabled,
            geolocation: config.geolocation,
            timezone: config.timezone,
            language: config.language,
            canvas: config.canvas
        };
        window.postMessage({
            type: '__BPG_CONFIG_RESPONSE__',
            config: injectedConfig
        }, '*');
    }
});
// Inject script synchronously - it will request config via postMessage
function injectScriptSync() {
    if (window.__BPG_CONTENT_INJECTED__) {
        return;
    }
    window.__BPG_CONTENT_INJECTED__ = true;
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected/injected.js');
    (document.head || document.documentElement).appendChild(script);
}
// Inject immediately
injectScriptSync();
