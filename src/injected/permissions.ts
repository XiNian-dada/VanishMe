import type { GeolocationConfig } from '../shared/types';
import { getOriginals, makeNativeFunction } from './utils';

function createFallbackPermissionStatus(targetWindow: any): PermissionStatus {
  const status: any = new (targetWindow.EventTarget || Object)();
  status.name = 'geolocation';
  status.state = 'granted';
  status.onchange = null;
  if (targetWindow.PermissionStatus && targetWindow.PermissionStatus.prototype) {
    Object.setPrototypeOf(status, targetWindow.PermissionStatus.prototype);
  }
  return status as PermissionStatus;
}

export function installPermissionsSpoof(config: GeolocationConfig, targetWindow: any = window): void {
  if (!config.enabled || !config.spoofPermission) return;

  const targetPerms = targetWindow.navigator?.permissions;
  if (!targetPerms) return;

  const targetProto = targetWindow.Permissions?.prototype || targetPerms;
  const originalQuery = getOriginals().permissionsQuery || targetProto.query;

  const spoofedQuery = function query(this: any, permissionDesc: any) {
    if (permissionDesc && permissionDesc.name === 'geolocation') {
      try {
        const promise = originalQuery.call(this, permissionDesc);
        return promise.then((realStatus: any) => {
          return new Proxy(realStatus, {
            get(target, prop, receiver) {
              if (prop === 'state') return 'granted';
              const val = Reflect.get(target, prop, receiver);
              if (typeof val === 'function') return val.bind(target);
              return val;
            }
          });
        }).catch(() => {
          return createFallbackPermissionStatus(targetWindow);
        });
      } catch {
        return Promise.resolve(createFallbackPermissionStatus(targetWindow));
      }
    }

    return originalQuery.call(this, permissionDesc);
  };

  targetProto.query = makeNativeFunction(spoofedQuery, originalQuery, 'query');
}
