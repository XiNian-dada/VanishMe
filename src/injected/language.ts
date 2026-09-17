import type { LanguageConfig } from '../shared/types';
import { safeDefineProperty, getOriginals, makeNativeFunction, createNativeGetter } from './utils';

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
        const collator = new OriginalCollator(effectiveLocales, options);
        const originalResolvedOptions = collator.resolvedOptions;
        collator.resolvedOptions = makeNativeFunction(function resolvedOptions(this: any) {
          const res = originalResolvedOptions.call(this);
          if (locales === undefined) {
            res.locale = config.language;
          }
          return res;
        }, originalResolvedOptions, 'resolvedOptions');
        return collator;
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
        const formatter = new OriginalNumberFormat(effectiveLocales, options);
        const originalResolvedOptions = formatter.resolvedOptions;
        formatter.resolvedOptions = makeNativeFunction(function resolvedOptions(this: any) {
          const res = originalResolvedOptions.call(this);
          if (locales === undefined) {
            res.locale = config.language;
          }
          return res;
        }, originalResolvedOptions, 'resolvedOptions');
        return formatter;
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
        const rules = new OriginalPluralRules(effectiveLocales, options);
        const originalResolvedOptions = rules.resolvedOptions;
        rules.resolvedOptions = makeNativeFunction(function resolvedOptions(this: any) {
          const res = originalResolvedOptions.call(this);
          if (locales === undefined) {
            res.locale = config.language;
          }
          return res;
        }, originalResolvedOptions, 'resolvedOptions');
        return rules;
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
}
