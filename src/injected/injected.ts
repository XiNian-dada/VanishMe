import type { InjectedConfig } from '../shared/types';
import { isSecurityChallenge } from '../shared/domain-matcher';
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
  if (isSecurityChallenge(window.location.hostname)) return;

  // 1. 保存原始方法，等待最新配置后再安装伪装。
  saveOriginalMethods();
  let activeConfig: InjectedConfig | null = null;
  let debugMode = false;

  // Track windows where spoofing has already been applied
  // Using WeakSet avoids polluting window objects with custom properties,
  // preventing SecurityError on cross-origin iframes (Cloudflare Turnstile, OpenAI login, etc.)
  const protectedWindows = new WeakSet<any>();

  const log = (...args: any[]) => {
    if (debugMode) {
      console.log('[VanishMe]', ...args);
    }
  };

  function applyConfigToWindow(config: InjectedConfig, targetWin: any) {
    if (!config || !config.enabled || !targetWin) return;
    if (protectedWindows.has(targetWin)) return;
    protectedWindows.add(targetWin);

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
      if (!protectedWindows.has(window)) {
        installAntiDetection();
        installIframeHooks();
      }
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

  // 2. 不读取页面旧缓存，以免已禁用的站点提前安装不可撤销的钩子。
  // 校验本次请求的 nonce，仅使用扩展返回的最新配置。
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
      applyConfig(config);
    } else if (event.data.type === '__VM_UPDATE__') {
      const config: InjectedConfig = event.data.config;
      applyConfig(config);
    }
  });

  // Request latest config from content script
  window.postMessage({ type: '__VM_REQ__', nonce }, '*');

  // 3. Hook iframe creation & contentWindow safely for same-origin dynamic iframes
  // Critical fix for Issue #4 / Cloudflare Turnstile / OpenAI login:
  // - Never access custom properties on cross-origin windows
  // - Catch all SecurityError when probing iframe origin
  // - Never throw from contentWindow getter
  function isSameOriginWindow(win: any): boolean {
    if (!win) return false;
    try {
      return Boolean(win.document && win.location && win.location.href);
    } catch {
      return false;
    }
  }

  function installIframeHooks() {
    try {
      if (typeof HTMLIFrameElement !== 'undefined' && HTMLIFrameElement.prototype) {
        const origContentWindowDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
        if (origContentWindowDesc && origContentWindowDesc.get) {
          const origGet = origContentWindowDesc.get;
          const wrappedContentWindow = function(this: HTMLIFrameElement) {
            const iWin = origGet.call(this);
            try {
              if (iWin && (iWin as any) !== window && isSameOriginWindow(iWin)) {
                if (activeConfig && activeConfig.enabled && !protectedWindows.has(iWin)) {
                  applyConfigToWindow(activeConfig, iWin);
                }
              }
            } catch {
              // Silently swallow any cross-origin inspection errors
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

      const targetDocProto = typeof Document !== 'undefined' ? Document.prototype : document;
      const originalCreateElement = targetDocProto.createElement || document.createElement;
      const wrappedCreateElement = function createElement(this: Document, tagName: string, options?: any) {
        const element = originalCreateElement.call(this, tagName, options);
        if (typeof tagName === 'string' && tagName.toLowerCase() === 'iframe') {
          element.addEventListener('load', () => {
            try {
              const iframeWin = (element as HTMLIFrameElement).contentWindow;
              if (iframeWin && (iframeWin as any) !== window && isSameOriginWindow(iframeWin)) {
                if (activeConfig && activeConfig.enabled && !protectedWindows.has(iframeWin)) {
                  applyConfigToWindow(activeConfig, iframeWin);
                }
              }
            } catch {}
          });
        }
        return element;
      };

      targetDocProto.createElement = makeNativeFunction(wrappedCreateElement, originalCreateElement, 'createElement') as any;
    } catch (e) {
      console.warn('VanishMe: Failed to hook iframe creation:', e);
    }
  }
})();
