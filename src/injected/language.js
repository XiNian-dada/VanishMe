import { safeDefineProperty } from './utils';
export function installLanguageSpoof(config) {
    if (!config.enabled)
        return;
    // Spoof navigator.language
    safeDefineProperty(Navigator.prototype, 'language', {
        get: function () {
            return config.language;
        },
        configurable: true,
        enumerable: true
    });
    // Spoof navigator.languages
    safeDefineProperty(Navigator.prototype, 'languages', {
        get: function () {
            return [...config.languages];
        },
        configurable: true,
        enumerable: true
    });
    // Spoof navigator.userLanguage (IE legacy)
    if ('userLanguage' in navigator) {
        safeDefineProperty(Navigator.prototype, 'userLanguage', {
            get: function () {
                return config.language;
            },
            configurable: true,
            enumerable: true
        });
    }
    // Spoof navigator.browserLanguage (IE legacy)
    if ('browserLanguage' in navigator) {
        safeDefineProperty(Navigator.prototype, 'browserLanguage', {
            get: function () {
                return config.language;
            },
            configurable: true,
            enumerable: true
        });
    }
}
