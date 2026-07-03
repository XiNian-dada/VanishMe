import { safeDefineProperty, getOriginals } from './utils';
export function installLanguageSpoof(config) {
    if (!config.enabled)
        return;
    const originals = getOriginals();
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
    // Spoof Intl.DateTimeFormat locale
    if (window.Intl && Intl.DateTimeFormat) {
        const originalResolvedOptions = originals.intlResolvedOptions || Intl.DateTimeFormat.prototype.resolvedOptions;
        try {
            Intl.DateTimeFormat.prototype.resolvedOptions = function () {
                const options = originalResolvedOptions.call(this);
                // Override locale to match configured language
                options.locale = config.language;
                return options;
            };
        }
        catch (error) {
            console.warn('Failed to spoof Intl.DateTimeFormat locale:', error);
        }
    }
    // Spoof Intl.Collator
    if (window.Intl && Intl.Collator) {
        const OriginalCollator = Intl.Collator;
        try {
            const NewCollator = function (locales, options) {
                return new OriginalCollator(config.languages, options);
            };
            NewCollator.prototype = OriginalCollator.prototype;
            NewCollator.supportedLocalesOf = OriginalCollator.supportedLocalesOf;
            Intl.Collator = NewCollator;
        }
        catch (error) {
            console.warn('Failed to spoof Intl.Collator:', error);
        }
    }
    // Spoof Intl.NumberFormat
    if (window.Intl && Intl.NumberFormat) {
        const OriginalNumberFormat = Intl.NumberFormat;
        try {
            const NewNumberFormat = function (locales, options) {
                return new OriginalNumberFormat(config.languages, options);
            };
            NewNumberFormat.prototype = OriginalNumberFormat.prototype;
            NewNumberFormat.supportedLocalesOf = OriginalNumberFormat.supportedLocalesOf;
            Intl.NumberFormat = NewNumberFormat;
        }
        catch (error) {
            console.warn('Failed to spoof Intl.NumberFormat:', error);
        }
    }
    // Spoof Intl.PluralRules
    if (window.Intl && Intl.PluralRules) {
        const OriginalPluralRules = Intl.PluralRules;
        try {
            const NewPluralRules = function (locales, options) {
                return new OriginalPluralRules(config.languages, options);
            };
            NewPluralRules.prototype = OriginalPluralRules.prototype;
            NewPluralRules.supportedLocalesOf = OriginalPluralRules.supportedLocalesOf;
            Intl.PluralRules = NewPluralRules;
        }
        catch (error) {
            console.warn('Failed to spoof Intl.PluralRules:', error);
        }
    }
}
