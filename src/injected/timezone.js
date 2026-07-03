import { getOriginals } from './utils';
export function installTimezoneSpoof(config) {
    if (!config.enabled)
        return;
    const originals = getOriginals();
    const targetTimezone = config.timezone;
    const targetOffset = config.offsetMinutes;
    // Store the original getTimezoneOffset
    const originalGetTimezoneOffset = originals.dateGetTimezoneOffset || Date.prototype.getTimezoneOffset;
    // DO NOT replace Date.prototype.getTimezoneOffset directly
    // Instead, we'll intercept it by redefining it with a getter that calls our spoofed version
    // But return the original function reference when inspected
    try {
        // Create a wrapper that will be called, but looks native when inspected
        const nativeLookingWrapper = new Proxy(originalGetTimezoneOffset, {
            apply(target, thisArg, args) {
                // When the function is called, return our fake offset
                return targetOffset;
            },
            get(target, prop) {
                // When properties are accessed (like toString), return the original's properties
                // This makes Function.prototype.toString.call(wrapper) return "[native code]"
                if (prop === 'toString') {
                    return function () { return 'function getTimezoneOffset() { [native code] }'; };
                }
                return target[prop];
            }
        });
        // Replace the method with our proxy
        Date.prototype.getTimezoneOffset = nativeLookingWrapper;
    }
    catch (error) {
        console.warn('Failed to spoof getTimezoneOffset:', error);
    }
    // Spoof Intl.DateTimeFormat - wrap the entire constructor
    if (window.Intl && Intl.DateTimeFormat) {
        const OriginalDateTimeFormat = Intl.DateTimeFormat;
        try {
            // @ts-ignore
            Intl.DateTimeFormat = function DateTimeFormat(...args) {
                // Create the original formatter
                const formatter = new OriginalDateTimeFormat(...args);
                // Save original resolvedOptions
                const originalResolvedOptions = formatter.resolvedOptions;
                // Override resolvedOptions on this instance
                formatter.resolvedOptions = function () {
                    const options = originalResolvedOptions.call(this);
                    // Use Proxy to intercept property access
                    return new Proxy(options, {
                        get(target, prop) {
                            if (prop === 'timeZone') {
                                console.log('VanishMe: Proxy intercepted timeZone access, returning:', targetTimezone);
                                return targetTimezone;
                            }
                            return target[prop];
                        }
                    });
                };
                return formatter;
            };
            // Copy static properties
            Object.setPrototypeOf(Intl.DateTimeFormat, OriginalDateTimeFormat);
            // @ts-ignore
            Object.defineProperty(Intl.DateTimeFormat, 'prototype', {
                value: OriginalDateTimeFormat.prototype,
                writable: false
            });
            console.log('VanishMe: Successfully installed Intl.DateTimeFormat spoof with Proxy');
        }
        catch (error) {
            console.warn('Failed to spoof Intl.DateTimeFormat:', error);
        }
    }
    // Generate timezone abbreviation from timezone name
    function getTimezoneAbbr(tzName) {
        const tzMap = {
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
        Date.prototype.toString = function () {
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
    }
    catch (error) {
        console.warn('Failed to spoof Date.toString:', error);
    }
    // Spoof Date.prototype.toTimeString
    try {
        Date.prototype.toTimeString = function () {
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
    }
    catch (error) {
        console.warn('Failed to spoof Date.toTimeString:', error);
    }
    // Spoof Date.prototype.toLocaleString
    try {
        const originalToLocaleString = originals.dateToLocaleString || Date.prototype.toLocaleString;
        Date.prototype.toLocaleString = function (locales, options) {
            if (!options || !options.timeZone) {
                options = { ...(options || {}), timeZone: targetTimezone };
            }
            return originalToLocaleString.call(this, locales, options);
        };
    }
    catch (error) {
        console.warn('Failed to spoof Date.toLocaleString:', error);
    }
    // Spoof Date.prototype.toLocaleDateString
    try {
        const originalToLocaleDateString = originals.dateToLocaleDateString || Date.prototype.toLocaleDateString;
        Date.prototype.toLocaleDateString = function (locales, options) {
            if (!options || !options.timeZone) {
                options = { ...(options || {}), timeZone: targetTimezone };
            }
            return originalToLocaleDateString.call(this, locales, options);
        };
    }
    catch (error) {
        console.warn('Failed to spoof Date.toLocaleDateString:', error);
    }
    // Spoof Date.prototype.toLocaleTimeString
    try {
        const originalToLocaleTimeString = originals.dateToLocaleTimeString || Date.prototype.toLocaleTimeString;
        Date.prototype.toLocaleTimeString = function (locales, options) {
            if (!options || !options.timeZone) {
                options = { ...(options || {}), timeZone: targetTimezone };
            }
            return originalToLocaleTimeString.call(this, locales, options);
        };
    }
    catch (error) {
        console.warn('Failed to spoof Date.toLocaleTimeString:', error);
    }
    // Spoof Date.prototype.getDate and other getters to use fake timezone
    // This affects how dates are displayed
    try {
        const originalGetFullYear = Date.prototype.getFullYear;
        Date.prototype.getFullYear = function () {
            const utcTime = this.getTime();
            const adjustedDate = new Date(utcTime - (targetOffset * 60000));
            return adjustedDate.getUTCFullYear();
        };
        const originalGetMonth = Date.prototype.getMonth;
        Date.prototype.getMonth = function () {
            const utcTime = this.getTime();
            const adjustedDate = new Date(utcTime - (targetOffset * 60000));
            return adjustedDate.getUTCMonth();
        };
        const originalGetDate = Date.prototype.getDate;
        Date.prototype.getDate = function () {
            const utcTime = this.getTime();
            const adjustedDate = new Date(utcTime - (targetOffset * 60000));
            return adjustedDate.getUTCDate();
        };
        const originalGetDay = Date.prototype.getDay;
        Date.prototype.getDay = function () {
            const utcTime = this.getTime();
            const adjustedDate = new Date(utcTime - (targetOffset * 60000));
            return adjustedDate.getUTCDay();
        };
        const originalGetHours = Date.prototype.getHours;
        Date.prototype.getHours = function () {
            const utcTime = this.getTime();
            const adjustedDate = new Date(utcTime - (targetOffset * 60000));
            return adjustedDate.getUTCHours();
        };
        const originalGetMinutes = Date.prototype.getMinutes;
        Date.prototype.getMinutes = function () {
            const utcTime = this.getTime();
            const adjustedDate = new Date(utcTime - (targetOffset * 60000));
            return adjustedDate.getUTCMinutes();
        };
        const originalGetSeconds = Date.prototype.getSeconds;
        Date.prototype.getSeconds = function () {
            const utcTime = this.getTime();
            const adjustedDate = new Date(utcTime - (targetOffset * 60000));
            return adjustedDate.getUTCSeconds();
        };
        const originalGetMilliseconds = Date.prototype.getMilliseconds;
        Date.prototype.getMilliseconds = function () {
            const utcTime = this.getTime();
            const adjustedDate = new Date(utcTime - (targetOffset * 60000));
            return adjustedDate.getUTCMilliseconds();
        };
    }
    catch (error) {
        console.warn('Failed to spoof Date getters:', error);
    }
}
