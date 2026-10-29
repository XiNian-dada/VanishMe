import type { InjectedConfig } from '../shared/types';
import { saveOriginalMethods, makeNativeFunction, createNativeGetter } from './utils';
import { installGeolocationSpoof } from './geolocation';
import { installPermissionsSpoof } from './permissions';
import { installTimezoneSpoof } from './timezone';
import { installLanguageSpoof } from './language';
import { installAntiDetection } from './anti-detection';
import { setupCanvasSpoofing } from './canvas-spoofing';
import { installSpeechSpoof } from './speech';
import { installWebRTCSpoof } from './webrtc';

(function() {
  // 1. Install anti-detection and save originals synchronously
  saveOriginalMethods();
  installAntiDetection();

  const CACHE_KEY = '__vm_cfg__';
  let activeConfig: InjectedConfig | null = null;
  let debugMode = false;

  const log = (...args: any[]) => {
    if (debugMode) {
      console.log('[VanishMe]', ...args);
    }
  };

  function applyConfigToWindow(config: InjectedConfig, targetWin: any) {
    if (!config || !config.enabled || !targetWin) return;
    try {
      if (config.geolocation && config.geolocation.enabled) {
        installGeolocationSpoof(config.geolocation, targetWin);
        installPermissionsSpoof(config.geolocation, targetWin);
      }
      if (config.timezone && config.timezone.enabled) {
        installTimezoneSpoof(config.timezone, targetWin, config.language?.language);
      }
      if (config.language && config.language.enabled) {
        installLanguageSpoof(config.language, targetWin);
        installSpeechSpoof(targetWin);
      }
      if (config.webrtc && config.webrtc.enabled) {
        installWebRTCSpoof(config.webrtc, targetWin);
      }
    } catch (e) {
      log('Failed to apply config to sub-window:', e);
    }
  }

  function applyConfig(config: InjectedConfig) {
    if (!config) return;
    activeConfig = config;
    debugMode = config.debugMode || false;

    if (!config.enabled) {
      log('Extension is disabled for this domain');
      return;
    }

    log('Applying spoofing configuration...');

    try {
      applyConfigToWindow(config, window);
      if (config.canvas && config.canvas.enabled) {
        log('Installing Canvas spoof');
        setupCanvasSpoofing(config.canvas);
      }
      log('All spoofs installed successfully');
    } catch (error) {
      console.error('VanishMe: Failed to install spoofs:', error);
    }
  }

  // 2. Try pre-cached config from sessionStorage for instant 0ms protection
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached && typeof cached === 'object') {
        applyConfig(cached);
      }
    }
  } catch {}

  // 3. Cryptographically secure nonce handshake with content script
  const nonce = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

  let liveConfigApplied = false;

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;

    if (event.data.type === '__VM_RES__' && event.data.nonce === nonce) {
      if (liveConfigApplied) return;
      liveConfigApplied = true;

      const config: InjectedConfig = event.data.config;
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(config));
      } catch {}

      applyConfig(config);
    } else if (event.data.type === '__VM_UPDATE__') {
      const config: InjectedConfig = event.data.config;
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(config));
      } catch {}

      applyConfig(config);
    }
  });

  // Request latest config from content script
  window.postMessage({ type: '__VM_REQ__', nonce }, '*');

  // 4. Hook iframe creation and contentWindow cleanly disguised as native code
  try {
    // Intercept HTMLIFrameElement.prototype.contentWindow for synchronous / detached iframe access
    if (typeof HTMLIFrameElement !== 'undefined' && HTMLIFrameElement.prototype) {
      const origContentWindowDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
      if (origContentWindowDesc && origContentWindowDesc.get) {
        const origGet = origContentWindowDesc.get;
        const wrappedContentWindow = function(this: HTMLIFrameElement) {
          const iWin = origGet.call(this);
          if (iWin && (iWin as any) !== window && !(iWin as any).__vm_injected) {
            (iWin as any).__vm_injected = true;
            if (activeConfig && activeConfig.enabled) {
              applyConfigToWindow(activeConfig, iWin);
            }
          }
          return iWin;
        };
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
          get: createNativeGetter('contentWindow', wrappedContentWindow, origGet) as any,
          configurable: true,
          enumerable: true
        });
      }
    }

    const originalCreateElement = document.createElement;
    const wrappedCreateElement = function createElement(this: Document, tagName: string, options?: any) {
      const element = originalCreateElement.call(this, tagName, options);
      if (typeof tagName === 'string' && tagName.toLowerCase() === 'iframe') {
        element.addEventListener('load', () => {
          try {
            const iframeWin = (element as HTMLIFrameElement).contentWindow;
            if (iframeWin && (iframeWin as any) !== window) {
              if (activeConfig && activeConfig.enabled) {
                applyConfigToWindow(activeConfig, iframeWin);
              }
            }
          } catch {}
        });
      }
      return element;
    };

    document.createElement = makeNativeFunction(wrappedCreateElement, originalCreateElement, 'createElement') as any;
  } catch (e) {
    console.warn('VanishMe: Failed to hook iframe creation:', e);
  }
})();
