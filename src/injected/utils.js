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
