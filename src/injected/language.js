import { safeDefineProperty, getOriginals } from './utils';
export function installLanguageSpoof(config) {
    if (!config.enabled)
        return;
    const originals = getOriginals();
    // Get the original descriptors before modification
    const originalLanguageDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'language');
    const originalLanguagesDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'languages');
    console.log('VanishMe: Original language descriptor:', originalLanguageDesc);
    console.log('VanishMe: Original languages descriptor:', originalLanguagesDesc);
    // Spoof navigator.language with Proxy wrapper (same strategy as Date.getTimezoneOffset)
    try {
        if (originalLanguageDesc && originalLanguageDesc.get) {
            const originalGetter = originalLanguageDesc.get;
            const proxyGetter = new Proxy(originalGetter, {
                apply(target, thisArg, args) {
                    // When called, return our fake language
                    return config.language;
                },
                get(target, prop) {
                    // When properties accessed (like toString), return original's properties
                    if (prop === 'toString') {
                        return function () { return 'function get language() { [native code] }'; };
                    }
                    return target[prop];
                }
            });
            Object.defineProperty(Navigator.prototype, 'language', {
                get: proxyGetter,
                configurable: true,
                enumerable: true
            });
            console.log('VanishMe: Successfully installed language spoof with Proxy');
        }
        else {
            console.warn('VanishMe: language descriptor has no getter, using fallback');
            // Fallback: define a simple getter
            Object.defineProperty(Navigator.prototype, 'language', {
                get: function () {
                    return config.language;
                },
                configurable: true,
                enumerable: true
            });
        }
    }
    catch (e) {
        console.warn('VanishMe: Failed to spoof navigator.language:', e);
    }
    // Spoof navigator.languages with Proxy wrapper
    try {
        if (originalLanguagesDesc && originalLanguagesDesc.get) {
            const originalGetter = originalLanguagesDesc.get;
            const proxyGetter = new Proxy(originalGetter, {
                apply(target, thisArg, args) {
                    // When called, return our fake languages array
                    return Object.freeze([...config.languages]);
                },
                get(target, prop) {
                    // When properties accessed (like toString), return original's properties
                    if (prop === 'toString') {
                        return function () { return 'function get languages() { [native code] }'; };
                    }
                    return target[prop];
                }
            });
            Object.defineProperty(Navigator.prototype, 'languages', {
                get: proxyGetter,
                configurable: true,
                enumerable: true
            });
            console.log('VanishMe: Successfully installed languages spoof with Proxy');
        }
        else {
            console.warn('VanishMe: languages descriptor has no getter, using fallback');
            // Fallback: define a simple getter
            Object.defineProperty(Navigator.prototype, 'languages', {
                get: function () {
                    return Object.freeze([...config.languages]);
                },
                configurable: true,
                enumerable: true
            });
        }
    }
    catch (e) {
        console.warn('VanishMe: Failed to spoof navigator.languages:', e);
    }
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
