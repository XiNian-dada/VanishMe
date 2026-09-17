import { isSpoofedFunction, markAsSpoofed, makeNativeFunction } from './utils';

// Anti-detection measures to hide spoofing from fingerprint detection
export function installAntiDetection(): void {
  // Hook Function.prototype.toString to always return native-looking code
  try {
    const originalToString = Function.prototype.toString;

    const customToString = function toString(this: any) {
      if (typeof this !== 'function') {
        throw new TypeError('Function.prototype.toString requires that \'this\' be a Function');
      }

      if (this === customToString || this === Function.prototype.toString) {
        return 'function toString() { [native code] }';
      }

      if (isSpoofedFunction(this)) {
        const funcName = this.name || '';
        if (funcName.startsWith('get ')) {
          return `function ${funcName}() { [native code] }`;
        }
        return `function ${funcName}() { [native code] }`;
      }

      const funcName = this.name;
      if (funcName) {
        if (funcName.startsWith('get ')) {
          const prop = funcName.slice(4);
          if (['language', 'languages', 'state'].includes(prop)) {
            return `function get ${prop}() { [native code] }`;
          }
        }
        if ([
          'getTimezoneOffset',
          'getCurrentPosition',
          'watchPosition',
          'clearWatch',
          'resolvedOptions',
          'createElement',
          'query'
        ].includes(funcName)) {
          return `function ${funcName}() { [native code] }`;
        }
      }

      return originalToString.call(this);
    };

    Object.defineProperty(customToString, 'name', { value: 'toString', configurable: true });
    Object.defineProperty(customToString, 'length', { value: 0, configurable: true });

    Function.prototype.toString = customToString;
    markAsSpoofed(customToString);
  } catch (e) {
    console.warn('VanishMe: Failed to hook Function.prototype.toString:', e);
  }

  // Prevent Error.stack inspection for detecting extension files
  try {
    const originalStackDesc = Object.getOwnPropertyDescriptor(Error.prototype, 'stack');

    if (originalStackDesc && originalStackDesc.get) {
      const originalStackGetter = originalStackDesc.get;
      const cleanStackGetter = function(this: any) {
        let stack = originalStackGetter.call(this);
        if (typeof stack === 'string') {
          stack = stack.replace(/chrome-extension:\/\/[^/\n]+/g, 'native');
          stack = stack.replace(/injected\.js/g, 'native');
          stack = stack.replace(/VanishMe:[^\n]*/g, '');
        }
        return stack;
      };

      Object.defineProperty(Error.prototype, 'stack', {
        get: makeNativeFunction(cleanStackGetter, originalStackGetter, 'get stack'),
        configurable: true
      });
    }
  } catch (e) {
    console.warn('VanishMe: Failed to hook Error.stack:', e);
  }
}
