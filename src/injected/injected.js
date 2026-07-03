import { saveOriginalMethods } from './utils';
import { installGeolocationSpoof } from './geolocation';
import { installPermissionsSpoof } from './permissions';
import { installTimezoneSpoof } from './timezone';
import { installLanguageSpoof } from './language';
(function () {
    // Prevent duplicate injection
    if (window.__BPG_INJECTED__) {
        return;
    }
    window.__BPG_INJECTED__ = true;
    console.log('VanishMe: Injected script loaded, requesting config...');
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
            console.log('VanishMe: Config received', config);
            if (!config || !config.enabled) {
                console.log('VanishMe: Extension is disabled');
                return;
            }
            console.log('VanishMe: Starting spoofing installation...');
            // Save original methods before spoofing
            saveOriginalMethods();
            // Install spoofs
            try {
                if (config.geolocation && config.geolocation.enabled) {
                    console.log('VanishMe: Installing geolocation spoof');
                    installGeolocationSpoof(config.geolocation);
                    installPermissionsSpoof(config.geolocation);
                }
                if (config.timezone && config.timezone.enabled) {
                    console.log('VanishMe: Installing timezone spoof');
                    installTimezoneSpoof(config.timezone);
                }
                if (config.language && config.language.enabled) {
                    console.log('VanishMe: Installing language spoof');
                    installLanguageSpoof(config.language);
                }
                console.log('VanishMe: All spoofs installed successfully');
                // Verify timezone spoof is working
                if (config.timezone && config.timezone.enabled) {
                    console.log('VanishMe: Verifying timezone spoof...');
                    try {
                        const testOffset = new Date().getTimezoneOffset();
                        console.log('VanishMe: getTimezoneOffset() returns:', testOffset);
                        const testIntl = new Intl.DateTimeFormat().resolvedOptions();
                        console.log('VanishMe: Intl.resolvedOptions() returns:', testIntl);
                        const testToString = new Date().toString();
                        console.log('VanishMe: Date.toString() returns:', testToString);
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
