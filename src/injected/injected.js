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
    // Get config from script data attribute
    const script = document.currentScript;
    if (!script || !script.dataset.bpgConfig) {
        console.warn('VanishMe: No config found');
        return;
    }
    let config;
    try {
        config = JSON.parse(script.dataset.bpgConfig);
    }
    catch (error) {
        console.error('VanishMe: Failed to parse config:', error);
        return;
    }
    if (!config.enabled) {
        return;
    }
    // Save original methods before spoofing
    saveOriginalMethods();
    // Install spoofs
    try {
        installGeolocationSpoof(config.geolocation);
        installPermissionsSpoof(config.geolocation);
        installTimezoneSpoof(config.timezone);
        installLanguageSpoof(config.language);
    }
    catch (error) {
        console.error('VanishMe: Failed to install spoofs:', error);
    }
})();
