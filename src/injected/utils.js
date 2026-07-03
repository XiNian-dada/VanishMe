export function saveOriginalMethods() {
    const win = window;
    if (!win.__BPG_ORIGINALS__) {
        win.__BPG_ORIGINALS__ = {};
    }
    const originals = win.__BPG_ORIGINALS__;
    // Geolocation
    if (navigator.geolocation) {
        originals.getCurrentPosition = navigator.geolocation.getCurrentPosition;
        originals.watchPosition = navigator.geolocation.watchPosition;
        originals.clearWatch = navigator.geolocation.clearWatch;
    }
    // Permissions
    if (navigator.permissions) {
        originals.permissionsQuery = navigator.permissions.query;
    }
    // Date
    originals.dateGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    originals.dateToString = Date.prototype.toString;
    originals.dateToTimeString = Date.prototype.toTimeString;
    originals.dateToLocaleString = Date.prototype.toLocaleString;
    originals.dateToLocaleDateString = Date.prototype.toLocaleDateString;
    originals.dateToLocaleTimeString = Date.prototype.toLocaleTimeString;
    // Intl
    if (window.Intl && Intl.DateTimeFormat) {
        originals.intlResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    }
    return originals;
}
export function getOriginals() {
    return window.__BPG_ORIGINALS__ || {};
}
export function safeDefineProperty(obj, prop, descriptor) {
    try {
        Object.defineProperty(obj, prop, descriptor);
        return true;
    }
    catch (error) {
        console.warn(`Failed to define property ${prop}:`, error);
        return false;
    }
}
// Hide function modification by making it look native
export function makeNativeFunction(func, originalFunc) {
    const handler = {
        apply(target, thisArg, args) {
            return func.apply(thisArg, args);
        },
        get(target, prop) {
            if (prop === 'toString') {
                // Return the original function's toString method, not a wrapper
                return function () { return originalFunc.toString(); };
            }
            if (prop === Symbol.toStringTag) {
                return originalFunc[Symbol.toStringTag];
            }
            if (prop === 'name') {
                return originalFunc.name;
            }
            if (prop === 'length') {
                return originalFunc.length;
            }
            // Return the property from the original function
            return originalFunc[prop];
        }
    };
    const proxied = new Proxy(func, handler);
    // Try to prevent Proxy detection
    try {
        // Make the Proxy look less like a Proxy
        Object.setPrototypeOf(proxied, originalFunc.constructor.prototype);
    }
    catch (e) {
        // Ignore errors
    }
    return proxied;
}
