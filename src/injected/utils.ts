const originalMethods: Record<string, any> = {};

export const spoofedFunctionSet = new WeakSet<Function>();

export function markAsSpoofed(fn: Function) {
  spoofedFunctionSet.add(fn);
  return fn;
}

export function isSpoofedFunction(fn: Function): boolean {
  return spoofedFunctionSet.has(fn);
}

export function saveOriginalMethods() {
  if (Object.keys(originalMethods).length > 0) {
    return originalMethods;
  }

  // Geolocation
  if (typeof Geolocation !== 'undefined' && Geolocation.prototype) {
    originalMethods.getCurrentPosition = Geolocation.prototype.getCurrentPosition;
    originalMethods.watchPosition = Geolocation.prototype.watchPosition;
    originalMethods.clearWatch = Geolocation.prototype.clearWatch;
  } else if (navigator.geolocation) {
    originalMethods.getCurrentPosition = navigator.geolocation.getCurrentPosition;
    originalMethods.watchPosition = navigator.geolocation.watchPosition;
    originalMethods.clearWatch = navigator.geolocation.clearWatch;
  }

  // Permissions
  if (navigator.permissions && typeof Permissions !== 'undefined' && Permissions.prototype) {
    originalMethods.permissionsQuery = Permissions.prototype.query || navigator.permissions.query;
  }

  // Date
  originalMethods.dateGetTimezoneOffset = Date.prototype.getTimezoneOffset;
  originalMethods.dateToString = Date.prototype.toString;
  originalMethods.dateToTimeString = Date.prototype.toTimeString;
  originalMethods.dateToLocaleString = Date.prototype.toLocaleString;
  originalMethods.dateToLocaleDateString = Date.prototype.toLocaleDateString;
  originalMethods.dateToLocaleTimeString = Date.prototype.toLocaleTimeString;

  // Intl
  if (window.Intl && Intl.DateTimeFormat) {
    originalMethods.intlResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
  }

  return originalMethods;
}

export function getOriginals() {
  return originalMethods;
}

export function safeDefineProperty(obj: any, prop: string, descriptor: PropertyDescriptor): boolean {
  try {
    Object.defineProperty(obj, prop, descriptor);
    return true;
  } catch (error) {
    console.warn(`Failed to define property ${prop}:`, error);
    return false;
  }
}

function isConstructor(fn: any): boolean {
  if (!fn || typeof fn !== 'function') return false;
  // Non-constructible methods and getters never have .prototype in WebIDL/ES6
  if (!('prototype' in fn)) return false;
  try {
    Reflect.construct(String, [], fn);
    return true;
  } catch {
    return false;
  }
}

// Hide function modification by making it look native
export function makeNativeFunction<T extends Function = Function>(func: T, originalFunc?: Function, customName?: string): T {
  const name = customName !== undefined ? customName : (originalFunc ? originalFunc.name : func.name);
  const length = originalFunc ? originalFunc.length : func.length;
  const constructible = originalFunc ? isConstructor(originalFunc) : isConstructor(func);

  let targetFunc: any;
  if (constructible) {
    targetFunc = function(this: any, ...args: any[]) {
      if (new.target) {
        return Reflect.construct(func, args, new.target);
      }
      return func.apply(this, args);
    };
    if (func.prototype) {
      targetFunc.prototype = func.prototype;
    }

    // Preserve prototype chain of constructors
    if (originalFunc) {
      try {
        Object.setPrototypeOf(targetFunc, Object.getPrototypeOf(originalFunc));
      } catch {}
    } else if (func) {
      try {
        Object.setPrototypeOf(targetFunc, Object.getPrototypeOf(func));
      } catch {}
    }

    // Preserve all static properties & methods (e.g. supportedLocalesOf, generateCertificate, etc.)
    const copyStaticProps = (source: any) => {
      if (!source) return;
      try {
        const descriptors = Object.getOwnPropertyDescriptors(source);
        for (const [prop, desc] of Object.entries(descriptors)) {
          if (['length', 'name', 'prototype', 'arguments', 'caller'].includes(prop)) {
            continue;
          }
          try {
            Object.defineProperty(targetFunc, prop, desc);
          } catch {}
        }
      } catch {}
    };

    copyStaticProps(originalFunc);
    copyStaticProps(func);
  } else {
    // Use concise method syntax so the function has NO .prototype and CANNOT be constructed with new
    const methodHolder = {
      [name](this: any, ...args: any[]) {
        return func.apply(this, args);
      }
    };
    targetFunc = methodHolder[name];
    if (originalFunc) {
      try {
        Object.setPrototypeOf(targetFunc, Object.getPrototypeOf(originalFunc));
      } catch {}
    }
  }

  try {
    Object.defineProperty(targetFunc, 'name', { value: name, configurable: true });
    Object.defineProperty(targetFunc, 'length', { value: length, configurable: true });
  } catch {}

  const handler: ProxyHandler<any> = {
    apply(target: any, thisArg: any, args: any[]) {
      return targetFunc.apply(thisArg, args);
    },
    get(target: any, prop: string | symbol, receiver: any) {
      if (prop === 'name') {
        return name;
      }
      if (prop === 'length') {
        return length;
      }
      return Reflect.get(target, prop, receiver);
    }
  };

  if (constructible) {
    handler.construct = function(target: any, args: any[], newTarget: any) {
      return Reflect.construct(targetFunc, args, newTarget);
    };
  }

  const proxied = new Proxy(targetFunc, handler);
  spoofedFunctionSet.add(proxied);
  spoofedFunctionSet.add(targetFunc);

  // Link prototype constructor to the spoofed proxy for 100% prototype consistency
  if (constructible) {
    if (originalFunc && originalFunc.prototype) {
      try {
        originalFunc.prototype.constructor = proxied;
      } catch {}
    }
    if (func && func.prototype) {
      try {
        func.prototype.constructor = proxied;
      } catch {}
    }
    if (targetFunc && targetFunc.prototype) {
      try {
        targetFunc.prototype.constructor = proxied;
      } catch {}
    }
  }

  return proxied as T;
}

// Create a native-looking getter function that satisfies strict fingerprint checks:
// 1. Natural ES6 getter has no .prototype ('prototype' in getter === false)
// 2. Cannot be called with new (throws TypeError)
// 3. Own property names: ['length', 'name']
// 4. Throws TypeError: Illegal invocation when called with incompatible receiver ({}, null, Navigator.prototype, etc.)
// 5. Function.prototype.toString returns 'function get <name>() { [native code] }'
export function createNativeGetter(
  name: string,
  getterImpl: (this: any) => any,
  originalGetter?: Function
): Function {
  const cleanName = name.startsWith('get ') ? name.slice(4) : name;
  const holder = {
    get [cleanName](): any {
      // Direct WebIDL brand check via original getter if available (catches Navigator.prototype, {}, etc.)
      if (typeof originalGetter === 'function') {
        originalGetter.call(this);
      } else if (['language', 'languages', 'userLanguage', 'browserLanguage', 'contentWindow'].includes(cleanName)) {
        const isNav = Boolean(
          this &&
          this !== (typeof Navigator !== 'undefined' ? Navigator.prototype : null) &&
          (this.constructor?.name?.includes('Navigator') ||
           (typeof Navigator !== 'undefined' && this instanceof Navigator))
        );
        if (!isNav) {
          throw new TypeError('Illegal invocation');
        }
      }
      return getterImpl.call(this);
    }
  };
  const getter = Object.getOwnPropertyDescriptor(holder, cleanName)!.get!;
  return makeNativeFunction(getter, originalGetter, `get ${cleanName}`);
}

