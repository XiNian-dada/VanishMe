import type { GeolocationConfig } from '../shared/types';
import { getOriginals, makeNativeFunction } from './utils';

export function installGeolocationSpoof(config: GeolocationConfig, targetWindow: any = window): void {
  if (!config.enabled) return;

  const originals = getOriginals();
  const watchIdMap = new Map<number, number>();
  let nextWatchId = 1;

  function getCoordinates() {
    let { latitude, longitude, accuracy } = config;

    if (config.randomize && config.randomRadiusMeters > 0) {
      const randomOffset = randomCoordinateInRadius(latitude, longitude, config.randomRadiusMeters);
      latitude = randomOffset.latitude;
      longitude = randomOffset.longitude;
    }

    return { latitude, longitude, accuracy };
  }

  function randomCoordinateInRadius(lat: number, lon: number, radiusMeters: number) {
    if (radiusMeters <= 0) {
      return { latitude: lat, longitude: lon };
    }

    const earthRadius = 6371000;
    const distance = Math.random() * radiusMeters;
    const bearing = Math.random() * 2 * Math.PI;

    const lat1 = (lat * Math.PI) / 180;
    const lon1 = (lon * Math.PI) / 180;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distance / earthRadius) +
      Math.cos(lat1) * Math.sin(distance / earthRadius) * Math.cos(bearing)
    );

    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(distance / earthRadius) * Math.cos(lat1),
        Math.cos(distance / earthRadius) - Math.sin(lat1) * Math.sin(lat2)
      );

    const newLat = (lat2 * 180) / Math.PI;
    const newLon = (lon2 * 180) / Math.PI;

    return {
      latitude: Math.max(-90, Math.min(90, newLat)),
      longitude: ((newLon + 540) % 360) - 180
    };
  }

  function createPosition() {
    const coords = getCoordinates();
    const coordsObj = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    };

    if (targetWindow.GeolocationCoordinates && targetWindow.GeolocationCoordinates.prototype) {
      Object.setPrototypeOf(coordsObj, targetWindow.GeolocationCoordinates.prototype);
    }

    const positionObj = {
      coords: coordsObj,
      timestamp: Date.now()
    };

    if (targetWindow.GeolocationPosition && targetWindow.GeolocationPosition.prototype) {
      Object.setPrototypeOf(positionObj, targetWindow.GeolocationPosition.prototype);
    }

    return positionObj;
  }

  const targetProto = (targetWindow.Geolocation && targetWindow.Geolocation.prototype)
    ? targetWindow.Geolocation.prototype
    : (targetWindow.navigator && targetWindow.navigator.geolocation ? targetWindow.navigator.geolocation : null);

  if (!targetProto) return;

  const originalGetCurrentPosition = originals.getCurrentPosition || targetProto.getCurrentPosition;
  const spoofedGetCurrentPosition = function getCurrentPosition(
    this: any,
    successCallback: PositionCallback,
    errorCallback?: PositionErrorCallback,
    options?: PositionOptions
  ) {
    setTimeout(() => {
      try {
        const position = createPosition();
        successCallback(position as GeolocationPosition);
      } catch (error) {
        if (errorCallback) {
          errorCallback({
            code: 2,
            message: 'Position unavailable',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3
          } as GeolocationPositionError);
        }
      }
    }, 0);
  };

  targetProto.getCurrentPosition = makeNativeFunction(
    spoofedGetCurrentPosition,
    originalGetCurrentPosition,
    'getCurrentPosition'
  );

  const originalWatchPosition = originals.watchPosition || targetProto.watchPosition;
  const spoofedWatchPosition = function watchPosition(
    this: any,
    successCallback: PositionCallback,
    errorCallback?: PositionErrorCallback,
    options?: PositionOptions
  ) {
    const watchId = nextWatchId++;

    setTimeout(() => {
      try {
        const position = createPosition();
        successCallback(position as GeolocationPosition);
      } catch (error) {
        if (errorCallback) {
          errorCallback({
            code: 2,
            message: 'Position unavailable',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3
          } as GeolocationPositionError);
        }
      }
    }, 0);

    const intervalId = setInterval(() => {
      try {
        const position = createPosition();
        successCallback(position as GeolocationPosition);
      } catch (error) {
        // Silent failure for interval updates
      }
    }, 3000) as unknown as number;

    watchIdMap.set(watchId, intervalId);
    return watchId;
  };

  targetProto.watchPosition = makeNativeFunction(
    spoofedWatchPosition,
    originalWatchPosition,
    'watchPosition'
  );

  const originalClearWatch = originals.clearWatch || targetProto.clearWatch;
  const spoofedClearWatch = function clearWatch(this: any, watchId: number) {
    const intervalId = watchIdMap.get(watchId);
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      watchIdMap.delete(watchId);
    }
  };

  targetProto.clearWatch = makeNativeFunction(
    spoofedClearWatch,
    originalClearWatch,
    'clearWatch'
  );
}
