import type { TimezoneConfig } from '../shared/types';
import { getOriginals, makeNativeFunction } from './utils';

function getTimezoneDisplayName(date: Date, tzName: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tzName,
      timeZoneName: 'long'
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (tzPart && tzPart.value) {
      return tzPart.value;
    }
  } catch {}
  return tzName;
}

export function installTimezoneSpoof(config: TimezoneConfig, targetWindow: any = window): void {
  if (!config.enabled) return;

  const originals = getOriginals();
  const targetTimezone = config.timezone;
  const targetOffset = config.offsetMinutes;
  const targetDateProto = targetWindow.Date?.prototype;

  if (!targetDateProto) return;

  // 1. Spoof Date.prototype.getTimezoneOffset
  const originalGetTimezoneOffset = originals.dateGetTimezoneOffset || targetDateProto.getTimezoneOffset;
  const spoofedGetTimezoneOffset = function getTimezoneOffset(this: any) {
    if (isNaN(this.getTime())) return NaN;
    return targetOffset;
  };
  targetDateProto.getTimezoneOffset = makeNativeFunction(
    spoofedGetTimezoneOffset,
    originalGetTimezoneOffset,
    'getTimezoneOffset'
  );

  // 2. Spoof Intl.DateTimeFormat
  if (targetWindow.Intl && targetWindow.Intl.DateTimeFormat) {
    const OriginalDateTimeFormat = targetWindow.Intl.DateTimeFormat;

    const DateTimeFormatWrapper = function DateTimeFormat(...args: any[]) {
      let locales = args[0];
      let options = args[1];

      if (!options || typeof options !== 'object') {
        options = { timeZone: targetTimezone };
      } else if (!options.timeZone) {
        options = { ...options, timeZone: targetTimezone };
      }

      const formatter = new OriginalDateTimeFormat(locales, options);
      const originalResolvedOptions = formatter.resolvedOptions;

      formatter.resolvedOptions = makeNativeFunction(function resolvedOptions(this: any) {
        const res = originalResolvedOptions.call(this);
        res.timeZone = targetTimezone;
        return res;
      }, originalResolvedOptions, 'resolvedOptions');

      return formatter;
    };

    DateTimeFormatWrapper.prototype = OriginalDateTimeFormat.prototype;
    DateTimeFormatWrapper.supportedLocalesOf = OriginalDateTimeFormat.supportedLocalesOf;
    Object.setPrototypeOf(DateTimeFormatWrapper, OriginalDateTimeFormat);

    targetWindow.Intl.DateTimeFormat = makeNativeFunction(
      DateTimeFormatWrapper,
      OriginalDateTimeFormat,
      'DateTimeFormat'
    );
  }

  // 3. Spoof Date.prototype.toString
  const originalToString = originals.dateToString || targetDateProto.toString;
  const spoofedToString = function toString(this: any) {
    const utcTime = this.getTime();
    if (isNaN(utcTime)) {
      return 'Invalid Date';
    }

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
    const tzDisplayName = getTimezoneDisplayName(this, targetTimezone);

    return `${day} ${month} ${String(date).padStart(2, '0')} ${year} ${hours}:${minutes}:${seconds} ${offsetStr} (${tzDisplayName})`;
  };
  targetDateProto.toString = makeNativeFunction(spoofedToString, originalToString, 'toString');

  // 4. Spoof Date.prototype.toTimeString
  const originalToTimeString = originals.dateToTimeString || targetDateProto.toTimeString;
  const spoofedToTimeString = function toTimeString(this: any) {
    const utcTime = this.getTime();
    if (isNaN(utcTime)) {
      return 'Invalid Date';
    }

    const localTime = new Date(utcTime - (targetOffset * 60000));
    const hours = String(localTime.getUTCHours()).padStart(2, '0');
    const minutes = String(localTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(localTime.getUTCSeconds()).padStart(2, '0');

    const offsetHours = Math.floor(Math.abs(targetOffset) / 60);
    const offsetMins = Math.abs(targetOffset) % 60;
    const offsetSign = targetOffset > 0 ? '-' : '+';
    const offsetStr = `GMT${offsetSign}${String(offsetHours).padStart(2, '0')}${String(offsetMins).padStart(2, '0')}`;
    const tzDisplayName = getTimezoneDisplayName(this, targetTimezone);

    return `${hours}:${minutes}:${seconds} ${offsetStr} (${tzDisplayName})`;
  };
  targetDateProto.toTimeString = makeNativeFunction(spoofedToTimeString, originalToTimeString, 'toTimeString');

  // 5. Spoof Locale Date/Time methods
  const originalToLocaleString = originals.dateToLocaleString || targetDateProto.toLocaleString;
  targetDateProto.toLocaleString = makeNativeFunction(function toLocaleString(this: any, locales?: any, options?: any) {
    if (!options || !options.timeZone) {
      options = { ...(options || {}), timeZone: targetTimezone };
    }
    return originalToLocaleString.call(this, locales, options);
  }, originalToLocaleString, 'toLocaleString');

  const originalToLocaleDateString = originals.dateToLocaleDateString || targetDateProto.toLocaleDateString;
  targetDateProto.toLocaleDateString = makeNativeFunction(function toLocaleDateString(this: any, locales?: any, options?: any) {
    if (!options || !options.timeZone) {
      options = { ...(options || {}), timeZone: targetTimezone };
    }
    return originalToLocaleDateString.call(this, locales, options);
  }, originalToLocaleDateString, 'toLocaleDateString');

  const originalToLocaleTimeString = originals.dateToLocaleTimeString || targetDateProto.toLocaleTimeString;
  targetDateProto.toLocaleTimeString = makeNativeFunction(function toLocaleTimeString(this: any, locales?: any, options?: any) {
    if (!options || !options.timeZone) {
      options = { ...(options || {}), timeZone: targetTimezone };
    }
    return originalToLocaleTimeString.call(this, locales, options);
  }, originalToLocaleTimeString, 'toLocaleTimeString');

  // 6. Spoof Date getters to reflect target offset
  const originalGetFullYear = targetDateProto.getFullYear;
  targetDateProto.getFullYear = makeNativeFunction(function getFullYear(this: any) {
    const utcTime = this.getTime();
    if (isNaN(utcTime)) return NaN;
    return new Date(utcTime - (targetOffset * 60000)).getUTCFullYear();
  }, originalGetFullYear, 'getFullYear');

  const originalGetMonth = targetDateProto.getMonth;
  targetDateProto.getMonth = makeNativeFunction(function getMonth(this: any) {
    const utcTime = this.getTime();
    if (isNaN(utcTime)) return NaN;
    return new Date(utcTime - (targetOffset * 60000)).getUTCMonth();
  }, originalGetMonth, 'getMonth');

  const originalGetDate = targetDateProto.getDate;
  targetDateProto.getDate = makeNativeFunction(function getDate(this: any) {
    const utcTime = this.getTime();
    if (isNaN(utcTime)) return NaN;
    return new Date(utcTime - (targetOffset * 60000)).getUTCDate();
  }, originalGetDate, 'getDate');

  const originalGetDay = targetDateProto.getDay;
  targetDateProto.getDay = makeNativeFunction(function getDay(this: any) {
    const utcTime = this.getTime();
    if (isNaN(utcTime)) return NaN;
    return new Date(utcTime - (targetOffset * 60000)).getUTCDay();
  }, originalGetDay, 'getDay');

  const originalGetHours = targetDateProto.getHours;
  targetDateProto.getHours = makeNativeFunction(function getHours(this: any) {
    const utcTime = this.getTime();
    if (isNaN(utcTime)) return NaN;
    return new Date(utcTime - (targetOffset * 60000)).getUTCHours();
  }, originalGetHours, 'getHours');

  const originalGetMinutes = targetDateProto.getMinutes;
  targetDateProto.getMinutes = makeNativeFunction(function getMinutes(this: any) {
    const utcTime = this.getTime();
    if (isNaN(utcTime)) return NaN;
    return new Date(utcTime - (targetOffset * 60000)).getUTCMinutes();
  }, originalGetMinutes, 'getMinutes');

  const originalGetSeconds = targetDateProto.getSeconds;
  targetDateProto.getSeconds = makeNativeFunction(function getSeconds(this: any) {
    const utcTime = this.getTime();
    if (isNaN(utcTime)) return NaN;
    return new Date(utcTime - (targetOffset * 60000)).getUTCSeconds();
  }, originalGetSeconds, 'getSeconds');

  const originalGetMilliseconds = targetDateProto.getMilliseconds;
  targetDateProto.getMilliseconds = makeNativeFunction(function getMilliseconds(this: any) {
    const utcTime = this.getTime();
    if (isNaN(utcTime)) return NaN;
    return new Date(utcTime - (targetOffset * 60000)).getUTCMilliseconds();
  }, originalGetMilliseconds, 'getMilliseconds');
}
