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

  // Generate timezone abbreviation from timezone name
  function getTimezoneAbbr(tzName: string): string {
    const tzMap: Record<string, string> = {
      'America/Los_Angeles': 'PDT', // or PST
      'America/New_York': 'EDT', // or EST
      'Europe/London': 'BST', // or GMT
      'Europe/Berlin': 'CEST', // or CET
      'Asia/Tokyo': 'JST',
      'Asia/Shanghai': 'CST',
      'Asia/Singapore': 'SGT',
      'Australia/Sydney': 'AEDT' // or AEST
    };
    return tzMap[tzName] || 'GMT';
  }

  const tzAbbr = getTimezoneAbbr(targetTimezone);

  // Spoof Date.prototype.toString - show fake timezone
  try {
    Date.prototype.toString = function() {
      const utcTime = this.getTime();
      const localTime = new Date(utcTime - (targetOffset * 60000));

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const day = days[localTime.getUTCDay()];
      const month = months[localTime.getUTCMonth()];
      const date = localTime.getUTCDate();
      const year = localTime.getUTCFullYear();
      const hours = String(localTime.getUTCHours()).padStart(2, '0');
      const minutes = String(localTime.getUTCMinutes()).padStart(2, '0');
      const seconds = String(localTime.getUTCSeconds()).padStart(2, '0');

      const offsetHours = Math.floor(Math.abs(targetOffset) / 60);
      const offsetMins = Math.abs(targetOffset) % 60;
      const offsetSign = targetOffset > 0 ? '-' : '+';
      const offsetStr = `GMT${offsetSign}${String(offsetHours).padStart(2, '0')}${String(offsetMins).padStart(2, '0')}`;

      return `${day} ${month} ${String(date).padStart(2, '0')} ${year} ${hours}:${minutes}:${seconds} ${offsetStr} (${targetTimezone})`;
    };
  } catch (error) {
    console.warn('Failed to spoof Date.toString:', error);
  }

  // Spoof Date.prototype.toTimeString
  try {
    Date.prototype.toTimeString = function() {
      const utcTime = this.getTime();
      const localTime = new Date(utcTime - (targetOffset * 60000));

      const hours = String(localTime.getUTCHours()).padStart(2, '0');
      const minutes = String(localTime.getUTCMinutes()).padStart(2, '0');
      const seconds = String(localTime.getUTCSeconds()).padStart(2, '0');

      const offsetHours = Math.floor(Math.abs(targetOffset) / 60);
      const offsetMins = Math.abs(targetOffset) % 60;
      const offsetSign = targetOffset > 0 ? '-' : '+';
      const offsetStr = `GMT${offsetSign}${String(offsetHours).padStart(2, '0')}${String(offsetMins).padStart(2, '0')}`;

      return `${hours}:${minutes}:${seconds} ${offsetStr} (${targetTimezone})`;
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

  // Spoof Date.prototype.getDate and other getters to use fake timezone
  // This affects how dates are displayed
  try {
    const originalGetFullYear = Date.prototype.getFullYear;
    Date.prototype.getFullYear = function() {
      const utcTime = this.getTime();
      const adjustedDate = new Date(utcTime - (targetOffset * 60000));
      return adjustedDate.getUTCFullYear();
    };

    const originalGetMonth = Date.prototype.getMonth;
    Date.prototype.getMonth = function() {
      const utcTime = this.getTime();
      const adjustedDate = new Date(utcTime - (targetOffset * 60000));
      return adjustedDate.getUTCMonth();
    };

    const originalGetDate = Date.prototype.getDate;
    Date.prototype.getDate = function() {
      const utcTime = this.getTime();
      const adjustedDate = new Date(utcTime - (targetOffset * 60000));
      return adjustedDate.getUTCDate();
    };

    const originalGetDay = Date.prototype.getDay;
    Date.prototype.getDay = function() {
      const utcTime = this.getTime();
      const adjustedDate = new Date(utcTime - (targetOffset * 60000));
      return adjustedDate.getUTCDay();
    };

    const originalGetHours = Date.prototype.getHours;
    Date.prototype.getHours = function() {
      const utcTime = this.getTime();
      const adjustedDate = new Date(utcTime - (targetOffset * 60000));
      return adjustedDate.getUTCHours();
    };

    const originalGetMinutes = Date.prototype.getMinutes;
    Date.prototype.getMinutes = function() {
      const utcTime = this.getTime();
      const adjustedDate = new Date(utcTime - (targetOffset * 60000));
      return adjustedDate.getUTCMinutes();
    };

    const originalGetSeconds = Date.prototype.getSeconds;
    Date.prototype.getSeconds = function() {
      const utcTime = this.getTime();
      const adjustedDate = new Date(utcTime - (targetOffset * 60000));
      return adjustedDate.getUTCSeconds();
    };

    const originalGetMilliseconds = Date.prototype.getMilliseconds;
    Date.prototype.getMilliseconds = function() {
      const utcTime = this.getTime();
      const adjustedDate = new Date(utcTime - (targetOffset * 60000));
      return adjustedDate.getUTCMilliseconds();
    };
  } catch (error) {
    console.warn('Failed to spoof Date getters:', error);
  }
}
