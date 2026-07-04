import { saveOriginalMethods } from './utils';
import { installGeolocationSpoof } from './geolocation';
import { installPermissionsSpoof } from './permissions';
import { installTimezoneSpoof } from './timezone';
import { installLanguageSpoof } from './language';
import { installAntiDetection } from './anti-detection';
import { setupCanvasSpoofing } from './canvas-spoofing';
(function () {
    // Prevent duplicate injection
    if (window.__BPG_INJECTED__) {
        return;
    }
    window.__BPG_INJECTED__ = true;
    let debugMode = false; // Will be updated when config is received
    // Debug logger - only logs when debugMode is enabled
    const log = (...args) => {
        if (debugMode) {
            console.log('[VanishMe]', ...args);
        }
    };
    log('Injected script loaded, installing Canvas anti-detection immediately...');
    // CRITICAL: Install Canvas spoofing IMMEDIATELY with default config
    // This must happen before any page script runs to detect fonts
    // Font list is inlined to avoid import issues in MAIN world
    try {
        setupCanvasSpoofing({
            enabled: true,
            spoofFonts: true,
            targetFonts: [
                // Windows 简体中文字体
                'Microsoft YaHei', 'Microsoft YaHei UI', 'SimSun', 'NSimSun', 'SimHei',
                'KaiTi', 'FangSong', 'DengXian',
                // macOS 简体中文字体
                'PingFang SC', 'Hiragino Sans GB', 'STHeiti', 'STSong', 'Songti SC',
                // 开源简体中文字体
                'Source Han Sans CN', 'Source Han Sans SC',
                'Noto Sans CJK SC', 'Noto Serif CJK SC',
                'WenQuanYi Micro Hei', 'WenQuanYi Zen Hei',
                // 繁体中文字体
                'Microsoft JhengHei', 'PMingLiU', 'MingLiU', 'DFKai-SB',
                'PingFang TC', 'PingFang HK', 'Source Han Sans TW', 'Noto Sans CJK TC'
            ]
        });
        log('Canvas anti-detection installed at document_start');
    }
    catch (error) {
        console.error('VanishMe: Failed to install early Canvas spoof:', error);
    }
    log('Requesting full config...');
    // Request config from content script
    let configReceived = false;
    window.addEventListener('message', (event) => {
        if (event.source !== window)
            return;
        if (event.data.type === '__BPG_CONFIG_RESPONSE__') {
            if (configReceived)
                return; // Already processed
            configReceived = true;
            const config = event.data.config;
            // Update debug mode
            debugMode = config.debugMode || false;
            log('Config received', config);
            if (!config || !config.enabled) {
                log('Extension is disabled');
                return;
            }
            log('Starting spoofing installation...');
            // Install anti-detection first
            installAntiDetection();
            // Save original methods before spoofing
            saveOriginalMethods();
            // Install spoofs
            try {
                if (config.geolocation && config.geolocation.enabled) {
                    log('Installing geolocation spoof');
                    installGeolocationSpoof(config.geolocation);
                    installPermissionsSpoof(config.geolocation);
                }
                if (config.timezone && config.timezone.enabled) {
                    log('Installing timezone spoof');
                    installTimezoneSpoof(config.timezone);
                }
                if (config.language && config.language.enabled) {
                    log('Installing language spoof');
                    installLanguageSpoof(config.language);
                }
                if (config.canvas && config.canvas.enabled) {
                    log('Canvas already installed, skipping...');
                    // Canvas spoofing was already installed at document_start, no need to reinstall
                }
                log('All spoofs installed successfully');
                // Apply spoofs to all future iframes
                try {
                    const originalCreateElement = document.createElement;
                    document.createElement = function (tagName, options) {
                        const element = originalCreateElement.call(document, tagName, options);
                        if (tagName.toLowerCase() === 'iframe') {
                            element.addEventListener('load', () => {
                                try {
                                    const iframeWindow = element.contentWindow;
                                    if (iframeWindow) {
                                        // Try to apply spoofs to iframe (if same-origin)
                                        if (config.geolocation && config.geolocation.enabled) {
                                            try {
                                                installGeolocationSpoof.call(iframeWindow, config.geolocation);
                                            }
                                            catch (e) { }
                                        }
                                        if (config.timezone && config.timezone.enabled) {
                                            try {
                                                installTimezoneSpoof.call(iframeWindow, config.timezone);
                                            }
                                            catch (e) { }
                                        }
                                        if (config.language && config.language.enabled) {
                                            try {
                                                installLanguageSpoof.call(iframeWindow, config.language);
                                            }
                                            catch (e) { }
                                        }
                                    }
                                }
                                catch (e) {
                                    // Cross-origin iframe, can't access
                                }
                            });
                        }
                        return element;
                    };
                }
                catch (e) {
                    console.warn('VanishMe: Failed to hook iframe creation:', e);
                }
                // Verify timezone spoof is working
                if (config.timezone && config.timezone.enabled) {
                    log('Verifying timezone spoof...');
                    try {
                        const testOffset = new Date().getTimezoneOffset();
                        log('getTimezoneOffset() returns:', testOffset);
                        const testIntl = new Intl.DateTimeFormat().resolvedOptions();
                        log('Intl.resolvedOptions() returns:', testIntl);
                        const testToString = new Date().toString();
                        log('Date.toString() returns:', testToString);
                    }
                    catch (e) {
                        console.error('VanishMe: Verification failed:', e);
                    }
                }
            }
            catch (error) {
                console.error('VanishMe: Failed to install spoofs:', error);
            }
        }
    });
    // Send config request
    window.postMessage({ type: '__BPG_REQUEST_CONFIG__' }, '*');
})();
