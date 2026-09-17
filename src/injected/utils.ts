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

// Hide function modification by making it look native
export function makeNativeFunction<T extends Function = Function>(func: T, originalFunc?: Function, customName?: string): T {
  const name = customName !== undefined ? customName : (originalFunc ? originalFunc.name : func.name);
  const length = originalFunc ? originalFunc.length : func.length;

  const handler: ProxyHandler<any> = {
    apply(target: any, thisArg: any, args: any[]) {
      return func.apply(thisArg, args);
    },
    get(target: any, prop: string | symbol, receiver: any) {
      if (prop === 'toString') {
        const toStringFn = function toString() {
          return `function ${name}() { [native code] }`;
        };
        spoofedFunctionSet.add(toStringFn);
        return toStringFn;
      }
      if (prop === 'name') {
        return name;
      }
      if (prop === 'length') {
        return length;
      }
      return Reflect.get(target, prop, receiver);
    }
  };

  const proxied = new Proxy(func, handler);
  spoofedFunctionSet.add(proxied);

  return proxied as T;
}

// Create a native-looking getter function that satisfies strict fingerprint checks:
// 1. Natural ES6 getter has no .prototype ('prototype' in getter === false)
// 2. Own property names: ['length', 'name']
// 3. No own 'arguments' or 'caller'
// 4. Function.prototype.toString returns 'function get <name>() { [native code] }'
export function createNativeGetter(
  name: string,
  getterImpl: (this: any) => any,
  originalGetter?: Function
): Function {
  const cleanName = name.startsWith('get ') ? name.slice(4) : name;
  const holder = {
    get [cleanName](): any {
      return getterImpl.call(this);
    }
  };
  const getter = Object.getOwnPropertyDescriptor(holder, cleanName)!.get!;
  return makeNativeFunction(getter, originalGetter, `get ${cleanName}`);
}

