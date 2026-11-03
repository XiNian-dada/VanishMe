import type { LanguageConfig } from '../shared/types';
import { safeDefineProperty, getOriginals, makeNativeFunction, createNativeGetter, isSpoofedFunction } from './utils';

export function installLanguageSpoof(config: LanguageConfig, targetWindow: any = window): void {
  if (!config.enabled) return;

  const targetNavProto = targetWindow.Navigator?.prototype || targetWindow.navigator;
  if (!targetNavProto) return;

  // 1. Spoof navigator.language
  try {
    const originalLanguageDesc = Object.getOwnPropertyDescriptor(targetNavProto, 'language');
    const spoofedLanguageGetter = createNativeGetter('language', function language(this: any) {
      return config.language;
    }, originalLanguageDesc?.get);

    Object.defineProperty(targetNavProto, 'language', {
      get: spoofedLanguageGetter as any,
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    console.warn('VanishMe: Failed to spoof navigator.language:', e);
  }

  // 2. Spoof navigator.languages
  try {
    const originalLanguagesDesc = Object.getOwnPropertyDescriptor(targetNavProto, 'languages');
    const frozenLanguages = Object.freeze([...config.languages]);
    const spoofedLanguagesGetter = createNativeGetter('languages', function languages(this: any) {
      return frozenLanguages;
    }, originalLanguagesDesc?.get);

    Object.defineProperty(targetNavProto, 'languages', {
      get: spoofedLanguagesGetter as any,
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    console.warn('VanishMe: Failed to spoof navigator.languages:', e);
  }

  // 3. Spoof legacy language properties if present
  if (targetWindow.navigator && 'userLanguage' in targetWindow.navigator) {
    safeDefineProperty(targetNavProto, 'userLanguage', {
      get: createNativeGetter('userLanguage', function userLanguage() { return config.language; }) as any,
      configurable: true,
      enumerable: true
    });
  }

  if (targetWindow.navigator && 'browserLanguage' in targetWindow.navigator) {
    safeDefineProperty(targetNavProto, 'browserLanguage', {
      get: createNativeGetter('browserLanguage', function browserLanguage() { return config.language; }) as any,
      configurable: true,
      enumerable: true
    });
  }

  // 4. Spoof Intl.Collator
  if (targetWindow.Intl && targetWindow.Intl.Collator) {
    const OriginalCollator = targetWindow.Intl.Collator;
    try {
      const CollatorWrapper: any = function Collator(locales?: string | string[], options?: Intl.CollatorOptions) {
        const effectiveLocales = locales !== undefined ? locales : config.languages;
        if (new.target) {
          return Reflect.construct(OriginalCollator, [effectiveLocales, options], new.target);
        }
        return new OriginalCollator(effectiveLocales, options);
      };
      CollatorWrapper.prototype = OriginalCollator.prototype;
      CollatorWrapper.supportedLocalesOf = OriginalCollator.supportedLocalesOf;
      Object.setPrototypeOf(CollatorWrapper, OriginalCollator);
      targetWindow.Intl.Collator = makeNativeFunction(CollatorWrapper, OriginalCollator, 'Collator');
    } catch (error) {
      console.warn('Failed to spoof Intl.Collator:', error);
    }
  }

  // 5. Spoof Intl.NumberFormat
  if (targetWindow.Intl && targetWindow.Intl.NumberFormat) {
    const OriginalNumberFormat = targetWindow.Intl.NumberFormat;
    try {
      const NumberFormatWrapper: any = function NumberFormat(locales?: string | string[], options?: Intl.NumberFormatOptions) {
        const effectiveLocales = locales !== undefined ? locales : config.languages;
        if (new.target) {
          return Reflect.construct(OriginalNumberFormat, [effectiveLocales, options], new.target);
        }
        return new OriginalNumberFormat(effectiveLocales, options);
      };
      NumberFormatWrapper.prototype = OriginalNumberFormat.prototype;
      NumberFormatWrapper.supportedLocalesOf = OriginalNumberFormat.supportedLocalesOf;
      Object.setPrototypeOf(NumberFormatWrapper, OriginalNumberFormat);
      targetWindow.Intl.NumberFormat = makeNativeFunction(NumberFormatWrapper, OriginalNumberFormat, 'NumberFormat');
    } catch (error) {
      console.warn('Failed to spoof Intl.NumberFormat:', error);
    }
  }

  // 6. Spoof Intl.PluralRules
  if (targetWindow.Intl && targetWindow.Intl.PluralRules) {
    const OriginalPluralRules = targetWindow.Intl.PluralRules;
    try {
      const PluralRulesWrapper: any = function PluralRules(locales?: string | string[], options?: any) {
        const effectiveLocales = locales !== undefined ? locales : config.languages;
        if (new.target) {
          return Reflect.construct(OriginalPluralRules, [effectiveLocales, options], new.target);
        }
        return new OriginalPluralRules(effectiveLocales, options);
      };
      PluralRulesWrapper.prototype = OriginalPluralRules.prototype;
      PluralRulesWrapper.supportedLocalesOf = OriginalPluralRules.supportedLocalesOf;
      Object.setPrototypeOf(PluralRulesWrapper, OriginalPluralRules);
      targetWindow.Intl.PluralRules = makeNativeFunction(PluralRulesWrapper, OriginalPluralRules, 'PluralRules');
    } catch (error) {
      console.warn('Failed to spoof Intl.PluralRules:', error);
    }
  }

  // 7. Spoof Number.prototype.toLocaleString
  if (targetWindow.Number && targetWindow.Number.prototype) {
    const originalNumberToLocaleString = targetWindow.Number.prototype.toLocaleString;
    targetWindow.Number.prototype.toLocaleString = makeNativeFunction(function toLocaleString(this: any, locales?: any, options?: any) {
      const effectiveLocales = locales !== undefined ? locales : config.language;
      return originalNumberToLocaleString.call(this, effectiveLocales, options);
    }, originalNumberToLocaleString, 'toLocaleString');
  }

  // 8. Spoof String.prototype.localeCompare
  if (targetWindow.String && targetWindow.String.prototype) {
    const originalLocaleCompare = targetWindow.String.prototype.localeCompare;
    targetWindow.String.prototype.localeCompare = makeNativeFunction(function localeCompare(this: any, that: any, locales?: any, options?: any) {
      const effectiveLocales = locales !== undefined ? locales : config.language;
      return originalLocaleCompare.call(this, that, effectiveLocales, options);
    }, originalLocaleCompare, 'localeCompare');
  }

  // 9. Spoof Intl.RelativeTimeFormat
  if (targetWindow.Intl && targetWindow.Intl.RelativeTimeFormat) {
    const OriginalRelativeTimeFormat = targetWindow.Intl.RelativeTimeFormat;
    try {
      const RelativeTimeFormatWrapper: any = function RelativeTimeFormat(locales?: string | string[], options?: any) {
        const effectiveLocales = locales !== undefined ? locales : config.languages;
        if (new.target) {
          return Reflect.construct(OriginalRelativeTimeFormat, [effectiveLocales, options], new.target);
        }
        return new OriginalRelativeTimeFormat(effectiveLocales, options);
      };
      RelativeTimeFormatWrapper.prototype = OriginalRelativeTimeFormat.prototype;
      RelativeTimeFormatWrapper.supportedLocalesOf = OriginalRelativeTimeFormat.supportedLocalesOf;
      Object.setPrototypeOf(RelativeTimeFormatWrapper, OriginalRelativeTimeFormat);
      targetWindow.Intl.RelativeTimeFormat = makeNativeFunction(RelativeTimeFormatWrapper, OriginalRelativeTimeFormat, 'RelativeTimeFormat');
    } catch (e) {}
  }

  // 10. Spoof Intl.ListFormat
  if (targetWindow.Intl && targetWindow.Intl.ListFormat) {
    const OriginalListFormat = targetWindow.Intl.ListFormat;
    try {
      const ListFormatWrapper: any = function ListFormat(locales?: string | string[], options?: any) {
        const effectiveLocales = locales !== undefined ? locales : config.languages;
        if (new.target) {
          return Reflect.construct(OriginalListFormat, [effectiveLocales, options], new.target);
        }
        return new OriginalListFormat(effectiveLocales, options);
      };
      ListFormatWrapper.prototype = OriginalListFormat.prototype;
      ListFormatWrapper.supportedLocalesOf = OriginalListFormat.supportedLocalesOf;
      Object.setPrototypeOf(ListFormatWrapper, OriginalListFormat);
      targetWindow.Intl.ListFormat = makeNativeFunction(ListFormatWrapper, OriginalListFormat, 'ListFormat');
    } catch (e) {}
  }

  // 11. Spoof Date.prototype.toLocaleString / toLocaleDateString / toLocaleTimeString (avoid double-wrapping)
  if (targetWindow.Date && targetWindow.Date.prototype) {
    const dProto = targetWindow.Date.prototype;
    if (!isSpoofedFunction(dProto.toLocaleString)) {
      const origToLocaleString = dProto.toLocaleString;
      dProto.toLocaleString = makeNativeFunction(function toLocaleString(this: any, locales?: any, options?: any) {
        const effectiveLocales = locales !== undefined ? locales : config.language;
        return origToLocaleString.call(this, effectiveLocales, options);
      }, origToLocaleString, 'toLocaleString');
    }

    if (!isSpoofedFunction(dProto.toLocaleDateString)) {
      const origToLocaleDateString = dProto.toLocaleDateString;
      dProto.toLocaleDateString = makeNativeFunction(function toLocaleDateString(this: any, locales?: any, options?: any) {
        const effectiveLocales = locales !== undefined ? locales : config.language;
        return origToLocaleDateString.call(this, effectiveLocales, options);
      }, origToLocaleDateString, 'toLocaleDateString');
    }

    if (!isSpoofedFunction(dProto.toLocaleTimeString)) {
      const origToLocaleTimeString = dProto.toLocaleTimeString;
      dProto.toLocaleTimeString = makeNativeFunction(function toLocaleTimeString(this: any, locales?: any, options?: any) {
        const effectiveLocales = locales !== undefined ? locales : config.language;
        return origToLocaleTimeString.call(this, effectiveLocales, options);
      }, origToLocaleTimeString, 'toLocaleTimeString');
    }
  }
}
