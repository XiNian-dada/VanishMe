import type { LanguageConfig } from '../shared/types';
import { safeDefineProperty, getOriginals } from './utils';

export function installLanguageSpoof(config: LanguageConfig): void {
  if (!config.enabled) return;

  const originals = getOriginals();

  // Spoof navigator.language
  safeDefineProperty(Navigator.prototype, 'language', {
    get: function() {
      return config.language;
    },
    configurable: true,
    enumerable: true
  });

  // Spoof navigator.languages
  safeDefineProperty(Navigator.prototype, 'languages', {
    get: function() {
      return [...config.languages];
    },
    configurable: true,
    enumerable: true
  });

  // Spoof navigator.userLanguage (IE legacy)
  if ('userLanguage' in navigator) {
    safeDefineProperty(Navigator.prototype, 'userLanguage', {
      get: function() {
        return config.language;
      },
      configurable: true,
      enumerable: true
    });
  }

  // Spoof navigator.browserLanguage (IE legacy)
  if ('browserLanguage' in navigator) {
    safeDefineProperty(Navigator.prototype, 'browserLanguage', {
      get: function() {
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
      Intl.DateTimeFormat.prototype.resolvedOptions = function() {
        const options = originalResolvedOptions.call(this);
        // Override locale to match configured language
        options.locale = config.language;
        return options;
      };
    } catch (error) {
      console.warn('Failed to spoof Intl.DateTimeFormat locale:', error);
    }
  }

  // Spoof Intl.Collator
  if (window.Intl && Intl.Collator) {
    const OriginalCollator = Intl.Collator;
    try {
      const NewCollator: any = function(locales?: string | string[], options?: Intl.CollatorOptions) {
        return new OriginalCollator(config.languages, options);
      };
      NewCollator.prototype = OriginalCollator.prototype;
      NewCollator.supportedLocalesOf = OriginalCollator.supportedLocalesOf;
      (Intl as any).Collator = NewCollator;
    } catch (error) {
      console.warn('Failed to spoof Intl.Collator:', error);
    }
  }

  // Spoof Intl.NumberFormat
  if (window.Intl && Intl.NumberFormat) {
    const OriginalNumberFormat = Intl.NumberFormat;
    try {
      const NewNumberFormat: any = function(locales?: string | string[], options?: Intl.NumberFormatOptions) {
        return new OriginalNumberFormat(config.languages, options);
      };
      NewNumberFormat.prototype = OriginalNumberFormat.prototype;
      NewNumberFormat.supportedLocalesOf = OriginalNumberFormat.supportedLocalesOf;
      (Intl as any).NumberFormat = NewNumberFormat;
    } catch (error) {
      console.warn('Failed to spoof Intl.NumberFormat:', error);
    }
  }

  // Spoof Intl.PluralRules
  if (window.Intl && (Intl as any).PluralRules) {
    const OriginalPluralRules = (Intl as any).PluralRules;
    try {
      const NewPluralRules: any = function(locales?: string | string[], options?: any) {
        return new OriginalPluralRules(config.languages, options);
      };
      NewPluralRules.prototype = OriginalPluralRules.prototype;
      NewPluralRules.supportedLocalesOf = OriginalPluralRules.supportedLocalesOf;
      (Intl as any).PluralRules = NewPluralRules;
    } catch (error) {
      console.warn('Failed to spoof Intl.PluralRules:', error);
    }
  }
}
