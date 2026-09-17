import type { LanguageConfig } from '../shared/types';
import { safeDefineProperty, getOriginals, makeNativeFunction } from './utils';

export function installLanguageSpoof(config: LanguageConfig, targetWindow: any = window): void {
  if (!config.enabled) return;

  const targetNavProto = targetWindow.Navigator?.prototype || targetWindow.navigator;
  if (!targetNavProto) return;

  // 1. Spoof navigator.language
  try {
    const spoofedLanguageGetter = makeNativeFunction(function language(this: any) {
      return config.language;
    }, undefined, 'get language');

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
    const frozenLanguages = Object.freeze([...config.languages]);
    const spoofedLanguagesGetter = makeNativeFunction(function languages(this: any) {
      return frozenLanguages;
    }, undefined, 'get languages');

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
      get: makeNativeFunction(function userLanguage() { return config.language; }, undefined, 'get userLanguage'),
      configurable: true,
      enumerable: true
    });
  }

  if (targetWindow.navigator && 'browserLanguage' in targetWindow.navigator) {
    safeDefineProperty(targetNavProto, 'browserLanguage', {
      get: makeNativeFunction(function browserLanguage() { return config.language; }, undefined, 'get browserLanguage'),
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
}
