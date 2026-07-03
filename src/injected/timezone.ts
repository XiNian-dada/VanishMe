import type { TimezoneConfig } from '../shared/types';
import { getOriginals, safeDefineProperty } from './utils';

export function installTimezoneSpoof(config: TimezoneConfig): void {
  if (!config.enabled) return;

  const originals = getOriginals();
  const targetTimezone = config.timezone;
  const targetOffset = config.offsetMinutes;

  // Spoof Date.prototype.getTimezoneOffset
  try {
    Date.prototype.getTimezoneOffset = function() {
      return targetOffset;
    };
  } catch (error) {
    console.warn('Failed to spoof getTimezoneOffset:', error);
  }

  // Spoof Intl.DateTimeFormat.prototype.resolvedOptions
  if (window.Intl && Intl.DateTimeFormat) {
    const originalResolvedOptions = originals.intlResolvedOptions || Intl.DateTimeFormat.prototype.resolvedOptions;

    try {
      Intl.DateTimeFormat.prototype.resolvedOptions = function() {
        const options = originalResolvedOptions.call(this);
        options.timeZone = targetTimezone;
        return options;
      };
    } catch (error) {
      console.warn('Failed to spoof Intl.DateTimeFormat.resolvedOptions:', error);
    }
  }

  // Spoof Date.prototype.toString
  try {
    const originalToString = originals.dateToString || Date.prototype.toString;
    Date.prototype.toString = function() {
      const original = originalToString.call(this);
      // Try to replace timezone info in string
      // This is a best-effort approach
      return original;
    };
  } catch (error) {
    console.warn('Failed to spoof Date.toString:', error);
  }

  // Spoof Date.prototype.toTimeString
  try {
    const originalToTimeString = originals.dateToTimeString || Date.prototype.toTimeString;
    Date.prototype.toTimeString = function() {
      const original = originalToTimeString.call(this);
      return original;
    };
  } catch (error) {
    console.warn('Failed to spoof Date.toTimeString:', error);
  }

  // Spoof Date.prototype.toLocaleString
  try {
    const originalToLocaleString = originals.dateToLocaleString || Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
      if (!options || !options.timeZone) {
        options = { ...(options || {}), timeZone: targetTimezone };
      }
      return originalToLocaleString.call(this, locales, options);
    };
  } catch (error) {
    console.warn('Failed to spoof Date.toLocaleString:', error);
  }

  // Spoof Date.prototype.toLocaleDateString
  try {
    const originalToLocaleDateString = originals.dateToLocaleDateString || Date.prototype.toLocaleDateString;
    Date.prototype.toLocaleDateString = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
      if (!options || !options.timeZone) {
        options = { ...(options || {}), timeZone: targetTimezone };
      }
      return originalToLocaleDateString.call(this, locales, options);
    };
  } catch (error) {
    console.warn('Failed to spoof Date.toLocaleDateString:', error);
  }

  // Spoof Date.prototype.toLocaleTimeString
  try {
    const originalToLocaleTimeString = originals.dateToLocaleTimeString || Date.prototype.toLocaleTimeString;
    Date.prototype.toLocaleTimeString = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
      if (!options || !options.timeZone) {
        options = { ...(options || {}), timeZone: targetTimezone };
      }
      return originalToLocaleTimeString.call(this, locales, options);
    };
  } catch (error) {
    console.warn('Failed to spoof Date.toLocaleTimeString:', error);
  }
}
