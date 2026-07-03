// Anti-detection measures to hide spoofing from fingerprint detection
export function installAntiDetection() {
    // Save original native functions before ANY modifications
    const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    const originalDefineProperty = Object.defineProperty;
    // Create a hidden storage for original descriptors BEFORE any spoofing
    const nativeDescriptors = new Map();
    // Capture original native descriptors before they're modified
    try {
        const navLangDesc = originalGetOwnPropertyDescriptor.call(Object, Navigator.prototype, 'languages');
        const navLangDescSingle = originalGetOwnPropertyDescriptor.call(Object, Navigator.prototype, 'language');
        const dateOffsetDesc = originalGetOwnPropertyDescriptor.call(Object, Date.prototype, 'getTimezoneOffset');
        if (navLangDesc)
            nativeDescriptors.set('Navigator.prototype.languages', navLangDesc);
        if (navLangDescSingle)
            nativeDescriptors.set('Navigator.prototype.language', navLangDescSingle);
        if (dateOffsetDesc)
            nativeDescriptors.set('Date.prototype.getTimezoneOffset', dateOffsetDesc);
    }
    catch (e) {
        console.warn('VanishMe: Failed to capture native descriptors:', e);
    }
    // Override Object.getOwnPropertyDescriptor to return native descriptors for spoofed properties
    try {
        Object.getOwnPropertyDescriptor = function (obj, prop) {
            // For Navigator.prototype.languages and language - return the ORIGINAL native descriptor
            if (obj === Navigator.prototype && prop === 'languages') {
                const saved = nativeDescriptors.get('Navigator.prototype.languages');
                if (saved)
                    return { ...saved }; // Return a copy of the original
            }
            if (obj === Navigator.prototype && prop === 'language') {
                const saved = nativeDescriptors.get('Navigator.prototype.language');
                if (saved)
                    return { ...saved };
            }
            // For Date.prototype.getTimezoneOffset - return original descriptor that looks native
            if (obj === Date.prototype && prop === 'getTimezoneOffset') {
                const saved = nativeDescriptors.get('Date.prototype.getTimezoneOffset');
                if (saved) {
                    // Return a descriptor that points to the original native function
                    // This way, when detection code calls Function.prototype.toString on it,
                    // it will see [native code]
                    return { ...saved };
                }
            }
            // For all other properties, use original function
            return originalGetOwnPropertyDescriptor.call(Object, obj, prop);
        };
    }
    catch (e) {
        console.warn('VanishMe: Failed to hook getOwnPropertyDescriptor:', e);
    }
    // Hook Function.prototype.toString to always return native-looking code
    try {
        const originalToString = Function.prototype.toString;
        const nativeFunctionRegex = /function.*\(\)\s*\{\s*\[native code\]\s*\}/;
        Function.prototype.toString = function () {
            // If this is one of our spoofed functions, return native-looking string
            const funcStr = originalToString.call(this);
            // Check if function name matches spoofed functions
            const funcName = this.name;
            if (funcName && (funcName === 'getTimezoneOffset' ||
                funcName === 'getCurrentPosition' ||
                funcName === 'watchPosition' ||
                funcName === 'clearWatch' ||
                funcName === 'resolvedOptions')) {
                return `function ${funcName}() { [native code] }`;
            }
            return funcStr;
        };
    }
    catch (e) {
        console.warn('VanishMe: Failed to hook Function.prototype.toString:', e);
    }
    // Prevent Proxy detection
    try {
        // Some detection tries to check if Proxy is being used
        const OriginalProxy = window.Proxy;
        // Make our Proxies harder to detect
        window.Proxy = new Proxy(OriginalProxy, {
            construct(target, args) {
                const [targetObj, handler] = args;
                const proxy = new target(targetObj, handler);
                // Try to make the proxy look like a regular object
                try {
                    Object.setPrototypeOf(proxy, targetObj?.constructor?.prototype || Object.prototype);
                }
                catch (e) {
                    // Ignore
                }
                return proxy;
            }
        });
    }
    catch (e) {
        console.warn('VanishMe: Failed to hook Proxy:', e);
    }
    // Prevent Error.stack inspection for detecting our injection
    try {
        const originalError = Error;
        const originalStack = Object.getOwnPropertyDescriptor(Error.prototype, 'stack');
        if (originalStack && originalStack.get) {
            const originalStackGetter = originalStack.get;
            Object.defineProperty(Error.prototype, 'stack', {
                get: function () {
                    let stack = originalStackGetter.call(this);
                    if (stack) {
                        // Remove traces of our extension from stack traces
                        stack = stack.replace(/chrome-extension:\/\/[^/]+/g, 'native');
                        stack = stack.replace(/injected\.js/g, 'native');
                        stack = stack.replace(/VanishMe:/g, '');
                    }
                    return stack;
                },
                configurable: true
            });
        }
    }
    catch (e) {
        console.warn('VanishMe: Failed to hook Error.stack:', e);
    }
    // Prevent iframe-based detection by hooking iframe creation
    try {
        const originalCreateElement = document.createElement;
        document.createElement = function (tagName, options) {
            const element = originalCreateElement.call(document, tagName, options);
            if (tagName.toLowerCase() === 'iframe') {
                const originalLoad = element.onload;
                element.addEventListener('load', function () {
                    try {
                        const iframeWindow = element.contentWindow;
                        if (iframeWindow && iframeWindow.Date && iframeWindow.Navigator) {
                            // Apply same spoofs to iframe
                            const iframeDoc = iframeWindow.document;
                            // Spoof Date.getTimezoneOffset in iframe
                            if (iframeWindow.Date.prototype.getTimezoneOffset) {
                                const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
                                iframeWindow.Date.prototype.getTimezoneOffset = originalGetTimezoneOffset;
                            }
                            // Spoof Navigator.languages in iframe
                            if (iframeWindow.Navigator && iframeWindow.Navigator.prototype) {
                                const languagesDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'languages');
                                if (languagesDescriptor) {
                                    Object.defineProperty(iframeWindow.Navigator.prototype, 'languages', languagesDescriptor);
                                }
                            }
                        }
                    }
                    catch (e) {
                        // Cross-origin iframe, can't access
                    }
                });
            }
            return element;
        };
    }
    catch (e) {
        console.warn('VanishMe: Failed to hook iframe creation:', e);
    }
    console.log('VanishMe: Anti-detection measures installed');
}
