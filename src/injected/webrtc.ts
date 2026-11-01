import type { WebRTCConfig } from '../shared/types';
import { makeNativeFunction } from './utils';

const privateIpRegex = /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[0-1])\.|198\.18\.|127\.|169\.254\.)/;
const chineseIpv6Regex = /^(?:240e|2408|2409|2001:da8):/i;

/**
 * 校验某个 Candidate 字符串是否泄露了内网局域网 IP 或中国大陆运营商物理 IPv6
 */
function isLeakingCandidate(candidateStr: string): boolean {
  if (!candidateStr || typeof candidateStr !== 'string') return false;
  const parts = candidateStr.trim().split(/\s+/);
  if (parts.length < 8) return false;

  const ip = parts[4];
  const typIndex = parts.indexOf('typ');
  const typ = typIndex !== -1 ? parts[typIndex + 1] : '';

  // 1. 阻断局域网 host candidate 泄露内网拓扑 (10.x, 192.168.x, 198.18.x 等)
  if (typ === 'host' && (privateIpRegex.test(ip) || chineseIpv6Regex.test(ip))) {
    return true;
  }

  // 2. 阻断 srflx 候选通过本地私网物理网卡穿透 (raddr 为内网 IP)
  if (typ === 'srflx') {
    const raddrIndex = parts.indexOf('raddr');
    if (raddrIndex !== -1) {
      const raddr = parts[raddrIndex + 1];
      if (privateIpRegex.test(raddr) || chineseIpv6Regex.test(raddr)) {
        return true;
      }
    }
  }

  // 3. 阻断任何暴露中国大陆运营商物理 IPv6 (240e/2408/2409) 的 candidate
  if (chineseIpv6Regex.test(ip)) {
    return true;
  }

  return false;
}

/**
 * 清洗 SDP 字符串中的泄露 candidate 属性行
 */
function sanitizeSdp(sdp: string): string {
  if (!sdp || typeof sdp !== 'string') return sdp;
  return sdp
    .split('\n')
    .filter(line => {
      if (line.startsWith('a=candidate:')) {
        const candStr = line.slice(12);
        return !isLeakingCandidate(candStr);
      }
      return true;
    })
    .join('\n');
}

/**
 * 在 JavaScript 层拦截并防御 WebRTC STUN 穿透与 IP 泄漏
 * 当系统存在多物理网卡或代理未接管全部 UDP 时，JS 探针仍可通过 STUN 刺探物理 IP
 * 本拦截器阻断私网 host 及物理网卡穿透的 srflx candidate，提供坚如磐石的第二道防线
 */
export function installWebRTCSpoof(config: WebRTCConfig, targetWindow: any = window): void {
  if (!config || !config.enabled) return;

  const OriginalPeerConnection = targetWindow.RTCPeerConnection || targetWindow.webkitRTCPeerConnection;
  if (!OriginalPeerConnection) return;

  const originalProto = OriginalPeerConnection.prototype;
  const originalOnIceDesc = Object.getOwnPropertyDescriptor(originalProto, 'onicecandidate');
  const originalSetOnIce = originalOnIceDesc?.set;
  const originalGetOnIce = originalOnIceDesc?.get;
  const listenerMap = new WeakMap<Function, Function>();

  const RTCPeerConnectionWrapper = function RTCPeerConnection(this: any, rtcConfig?: RTCConfiguration) {
    const pc = new OriginalPeerConnection(rtcConfig);
    let rawHandler: any = null;
    let wrappedHandler: any = null;

    // 1. 劫持 onicecandidate 属性 (双向过滤：无论是浏览器内部触发还是脚本直接调用)
    Object.defineProperty(pc, 'onicecandidate', {
      get() {
        return wrappedHandler;
      },
      set(fn: any) {
        rawHandler = fn;
        if (typeof fn === 'function') {
          wrappedHandler = function(this: any, event: RTCPeerConnectionIceEvent) {
            if (event && event.candidate && event.candidate.candidate) {
              if (isLeakingCandidate(event.candidate.candidate)) {
                // 彻底阻断内网 host 及旁路物理 IP 泄露
                return;
              }
            }
            return fn.call(this, event);
          };
          makeNativeFunction(wrappedHandler, fn, 'onicecandidate');
        } else {
          wrappedHandler = null;
        }

        if (originalSetOnIce) {
          originalSetOnIce.call(pc, wrappedHandler);
        }
      },
      configurable: true,
      enumerable: true
    });

    // 2. 劫持 addEventListener('icecandidate', ...)
    const originalAddEventListener = pc.addEventListener;
    if (typeof originalAddEventListener === 'function') {
      const wrappedAddEventListener = function(this: any, type: string, listener: any, options?: any) {
        if (type === 'icecandidate' && typeof listener === 'function') {
          let wrapped = listenerMap.get(listener);
          if (!wrapped) {
            wrapped = function(this: any, event: RTCPeerConnectionIceEvent) {
              if (event && event.candidate && event.candidate.candidate) {
                if (isLeakingCandidate(event.candidate.candidate)) {
                  return;
                }
              }
              listener.call(this, event);
            };
            listenerMap.set(listener, wrapped);
          }
          return originalAddEventListener.call(this, type, wrapped as EventListener, options);
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
      pc.addEventListener = makeNativeFunction(wrappedAddEventListener, originalAddEventListener, 'addEventListener');
    }

    // 3. 劫持 removeEventListener
    const originalRemoveEventListener = pc.removeEventListener;
    if (typeof originalRemoveEventListener === 'function') {
      const wrappedRemoveEventListener = function(this: any, type: string, listener: any, options?: any) {
        if (type === 'icecandidate' && typeof listener === 'function') {
          const wrapped = listenerMap.get(listener) || listener;
          return originalRemoveEventListener.call(this, type, wrapped as EventListener, options);
        }
        return originalRemoveEventListener.call(this, type, listener, options);
      };
      pc.removeEventListener = makeNativeFunction(wrappedRemoveEventListener, originalRemoveEventListener, 'removeEventListener');
    }

    // 4. 劫持 createOffer / createAnswer 净化 SDP (同时兼容 Promise 与 Legacy Callback)
    const sanitizeDesc = (desc: any) => {
      if (desc && desc.sdp && typeof desc.sdp === 'string') {
        const sanitized = sanitizeSdp(desc.sdp);
        if (typeof RTCSessionDescription !== 'undefined') {
          return new RTCSessionDescription({ type: desc.type, sdp: sanitized });
        }
        return { type: desc.type, sdp: sanitized };
      }
      return desc;
    };

    const originalCreateOffer = pc.createOffer;
    if (typeof originalCreateOffer === 'function') {
      const wrappedCreateOffer = function(this: any, ...args: any[]) {
        if (typeof args[0] === 'function') {
          const origSuccess = args[0];
          args[0] = function(offer: any) {
            return origSuccess.call(this, sanitizeDesc(offer));
          };
          return originalCreateOffer.apply(this, args);
        }
        const promise = originalCreateOffer.apply(this, args);
        if (promise && typeof promise.then === 'function') {
          return promise.then((offer: any) => sanitizeDesc(offer));
        }
        return promise;
      };
      pc.createOffer = makeNativeFunction(wrappedCreateOffer, originalCreateOffer, 'createOffer');
    }

    const originalCreateAnswer = pc.createAnswer;
    if (typeof originalCreateAnswer === 'function') {
      const wrappedCreateAnswer = function(this: any, ...args: any[]) {
        if (typeof args[0] === 'function') {
          const origSuccess = args[0];
          args[0] = function(answer: any) {
            return origSuccess.call(this, sanitizeDesc(answer));
          };
          return originalCreateAnswer.apply(this, args);
        }
        const promise = originalCreateAnswer.apply(this, args);
        if (promise && typeof promise.then === 'function') {
          return promise.then((answer: any) => sanitizeDesc(answer));
        }
        return promise;
      };
      pc.createAnswer = makeNativeFunction(wrappedCreateAnswer, originalCreateAnswer, 'createAnswer');
    }

    return pc;
  };

  RTCPeerConnectionWrapper.prototype = OriginalPeerConnection.prototype;
  RTCPeerConnectionWrapper.defaultIceServers = OriginalPeerConnection.defaultIceServers;
  RTCPeerConnectionWrapper.generateCertificate = OriginalPeerConnection.generateCertificate;
  Object.setPrototypeOf(RTCPeerConnectionWrapper, OriginalPeerConnection);

  const nativePC = makeNativeFunction(
    RTCPeerConnectionWrapper,
    OriginalPeerConnection,
    'RTCPeerConnection'
  );

  targetWindow.RTCPeerConnection = nativePC;
  if (targetWindow.webkitRTCPeerConnection) {
    targetWindow.webkitRTCPeerConnection = nativePC;
  }
}
