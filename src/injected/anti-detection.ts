import { isSpoofedFunction, markAsSpoofed, makeNativeFunction, createNativeGetter } from './utils';

// Anti-detection measures to hide spoofing from fingerprint detection
export function installAntiDetection(): void {
  // Hook Function.prototype.toString to always return native-looking code
  try {
    const originalToString = Function.prototype.toString;

    const toStringHolder = {
      toString(this: any) {
        if (typeof this !== 'function') {
          throw new TypeError("Function.prototype.toString requires that 'this' be a Function");
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
            if (['language', 'languages', 'state', 'stack', 'contentWindow', 'userLanguage', 'browserLanguage'].includes(prop)) {
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
      }
    };
    const customToString = toStringHolder.toString;

    Object.defineProperty(customToString, 'name', { value: 'toString', configurable: true });
    Object.defineProperty(customToString, 'length', { value: 0, configurable: true });

    Function.prototype.toString = customToString;
    markAsSpoofed(customToString);
  } catch (e) {
    console.warn('VanishMe: Failed to hook Function.prototype.toString:', e);
  }

  // Prevent Error.stack inspection for detecting extension files (CreepJS & Commercial WAFs)
  const cleanStackString = (str: any): string => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/chrome-extension:\/\/[^\s\n\)]+/g, 'native')
      .replace(/injected\.js/g, 'native')
      .replace(/VanishMe[^\s\n\)]*/g, '');
  };

  // 1. Hook V8 Error.prepareStackTrace
  try {
    const originalPrepare = (Error as any).prepareStackTrace;
    (Error as any).prepareStackTrace = function(error: Error, structuredStackTrace: any[]) {
      if (typeof originalPrepare === 'function') {
        const raw = originalPrepare(error, structuredStackTrace);
        return cleanStackString(raw);
      }
      const stack = [error.name + ': ' + error.message];
      for (const frame of structuredStackTrace) {
        let fnName = frame.getFunctionName?.() || frame.getMethodName?.() || '';
        let file = frame.getFileName?.() || '';
        file = cleanStackString(file);
        let line = frame.getLineNumber?.();
        let col = frame.getColumnNumber?.();
        stack.push(`    at ${fnName ? fnName + ' ' : ''}(${file}${line ? ':' + line : ''}${col ? ':' + col : ''})`);
      }
      return stack.join('\n');
    };
  } catch {}

  // 2. Hook V8 Error.captureStackTrace
  try {
    const originalCapture = (Error as any).captureStackTrace;
    if (typeof originalCapture === 'function') {
      (Error as any).captureStackTrace = function(target: any, ctor?: any) {
        originalCapture.call(this, target, ctor);
        if (target && target.stack) {
          target.stack = cleanStackString(target.stack);
        }
      };
    }
  } catch {}

  // 3. Hook Error.prototype.stack (Safari / Firefox / Chromium fallback)
  try {
    const originalStackDesc = Object.getOwnPropertyDescriptor(Error.prototype, 'stack');
    if (originalStackDesc && originalStackDesc.get) {
      const originalStackGetter = originalStackDesc.get;
      const cleanStackGetter = function(this: any) {
        return cleanStackString(originalStackGetter.call(this));
      };

      Object.defineProperty(Error.prototype, 'stack', {
        get: createNativeGetter('stack', cleanStackGetter, originalStackGetter) as any,
        configurable: true
      });
    }
  } catch (e) {
    console.warn('VanishMe: Failed to hook Error.stack:', e);
  }
}
