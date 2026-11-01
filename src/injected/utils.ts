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
  const constructible = isConstructor(originalFunc || func);

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
      if (Reflect.has(target, prop)) {
        return Reflect.get(target, prop, receiver);
      }
      if (func && Reflect.has(func, prop)) {
        return Reflect.get(func, prop, receiver);
      }
      if (originalFunc && Reflect.has(originalFunc, prop)) {
        return Reflect.get(originalFunc, prop, receiver);
      }
      return Reflect.get(target, prop, receiver);
    },
    has(target: any, prop: string | symbol) {
      return (
        Reflect.has(target, prop) ||
        Boolean(func && Reflect.has(func, prop)) ||
        Boolean(originalFunc && Reflect.has(originalFunc, prop))
      );
    },
    ownKeys(target: any) {
      const keys = new Set(Reflect.ownKeys(target));
      if (func) {
        for (const k of Reflect.ownKeys(func)) {
          if (k !== 'arguments' && k !== 'caller') keys.add(k);
        }
      }
      if (originalFunc) {
        for (const k of Reflect.ownKeys(originalFunc)) {
          if (k !== 'arguments' && k !== 'caller') keys.add(k);
        }
      }
      return Array.from(keys);
    },
    getOwnPropertyDescriptor(target: any, prop: string | symbol) {
      const targetDesc = Reflect.getOwnPropertyDescriptor(target, prop);
      if (targetDesc) return targetDesc;
      if (func) {
        const funcDesc = Reflect.getOwnPropertyDescriptor(func, prop);
        if (funcDesc) return funcDesc;
      }
      if (originalFunc) {
        const origDesc = Reflect.getOwnPropertyDescriptor(originalFunc, prop);
        if (origDesc) return origDesc;
      }
      return undefined;
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

  return proxied as T;
}

// Create a native-looking getter function that satisfies strict fingerprint checks:
// 1. Natural ES6 getter has no .prototype ('prototype' in getter === false)
// 2. Cannot be called with new (throws TypeError)
// 3. Own property names: ['length', 'name']
// 4. Throws TypeError: Illegal invocation when called with incompatible receiver ({}, null, etc.)
// 5. Function.prototype.toString returns 'function get <name>() { [native code] }'
export function createNativeGetter(
  name: string,
  getterImpl: (this: any) => any,
  originalGetter?: Function
): Function {
  const cleanName = name.startsWith('get ') ? name.slice(4) : name;
  const holder = {
    get [cleanName](): any {
      // Illegal invocation defense (CreepJS & DataDome check)
      if (['language', 'languages', 'userLanguage', 'browserLanguage'].includes(cleanName)) {
        const isNav = Boolean(
          this &&
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

