import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));

function createModuleLoader(contextOverrides = {}) {
  const context = vm.createContext({
    console,
    Function,
    Date,
    Intl,
    Math,
    Set,
    Map,
    WeakMap,
    WeakSet,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    TypeError,
    Promise,
    setTimeout,
    clearTimeout,
    ...contextOverrides
  });

  const modules = new Map();
  function load(specifier, fromPath = resolve(root, 'tests/leak-test.test.mjs')) {
    let absPath = specifier.startsWith('.')
      ? resolve(dirname(fromPath), specifier)
      : resolve(root, specifier);
    if (!absPath.endsWith('.ts') && !absPath.endsWith('.js')) {
      absPath += '.ts';
    }

    if (modules.has(absPath)) {
      return modules.get(absPath).exports;
    }

    const module = { exports: {} };
    modules.set(absPath, module);

    const source = readFileSync(absPath, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true
      }
    });

    const localRequire = (reqSpec) => load(reqSpec, absPath);
    const fn = vm.runInContext(
      `(function(exports, require, module, __filename, __dirname) { ${outputText}\n})`,
      context
    );
    fn(module.exports, localRequire, module, absPath, dirname(absPath));
    return module.exports;
  }

  return { load, context };
}

test('Claude detector flags Chinese environment indicators', () => {
  const { load } = createModuleLoader();
  const { evaluateChineseRisk } = load('../src/leak-test/claude-detector');

  const mockChinaWin = {
    Intl: {
      DateTimeFormat: class {
        resolvedOptions() {
          return { timeZone: 'Asia/Shanghai', locale: 'zh-CN' };
        }
        format() {
          return '2026年10月29日 上午10:00';
        }
      }
    },
    Date: class {
      getTimezoneOffset() {
        return -480;
      }
      toString() {
        return 'Thu Oct 29 2026 10:00:00 GMT+0800 (中国标准时间)';
      }
    },
    navigator: {
      language: 'zh-CN',
      languages: ['zh-CN', 'zh', 'en-US'],
      platform: 'MacIntel'
    }
  };

  const audit = evaluateChineseRisk(mockChinaWin, {
    ip: '104.28.19.4',
    countryCode: 'US',
    timezone: 'America/Los_Angeles'
  }, { latitude: 31.2304, longitude: 121.4737 });

  assert.ok(audit.result.totalRiskPoints >= 80, 'Chinese environment should have high risk score');
  assert.equal(audit.result.timezoneLeaked, true);
  assert.equal(audit.result.offsetLeaked, true);
  assert.equal(audit.result.dateStringLeaked, true);
  assert.equal(audit.result.languageLeaked, true);
  assert.equal(audit.result.languagesLeaked, true);
  assert.equal(audit.result.geoInChina, true);

  const mismatchCheck = audit.checks.find(c => c.id === 'claude-mismatch');
  assert.ok(mismatchCheck, 'Should have flagged IP vs Timezone fatal cross mismatch');
  assert.equal(mismatchCheck.status, 'fail');
});

test('Claude detector passes pure overseas environment', () => {
  const { load } = createModuleLoader();
  const { evaluateChineseRisk } = load('../src/leak-test/claude-detector');

  const mockUSWin = {
    Intl: {
      DateTimeFormat: class {
        resolvedOptions() {
          return { timeZone: 'America/Los_Angeles', locale: 'en-US' };
        }
        format() {
          return '10/29/2026, 10:00 AM';
        }
      }
    },
    Date: class {
      getTimezoneOffset() {
        return 420;
      }
      toString() {
        return 'Thu Oct 29 2026 10:00:00 GMT-0700 (Pacific Daylight Time)';
      }
    },
    navigator: {
      language: 'en-US',
      languages: ['en-US', 'en'],
      platform: 'MacIntel'
    }
  };

  const audit = evaluateChineseRisk(mockUSWin, {
    ip: '104.28.19.4',
    countryCode: 'US',
    timezone: 'America/Los_Angeles'
  }, { latitude: 34.0522, longitude: -118.2437 });

  assert.equal(audit.result.totalRiskPoints, 0, 'Clean US environment should have 0 risk points');
  assert.equal(audit.result.timezoneLeaked, false);
  assert.equal(audit.result.offsetLeaked, false);
  assert.equal(audit.result.languageLeaked, false);
  assert.equal(audit.result.geoInChina, false);
  assert.match(audit.result.summary, /纯净海外环境/);
});

test('WebRTC protection intercepts and blocks STUN private/physical IP leaks', () => {
  class MockOriginalRTCPeerConnection {
    constructor() {
      this.listeners = new Map();
      this.onicecandidate = null;
    }
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(listener);
    }
    removeEventListener(type, listener) {
      if (this.listeners.has(type)) this.listeners.get(type).delete(listener);
    }
    dispatchCandidate(candidateStr) {
      const event = { candidate: candidateStr ? { candidate: candidateStr } : null };
      if (typeof this.onicecandidate === 'function') {
        this.onicecandidate(event);
      }
      const set = this.listeners.get('icecandidate');
      if (set) {
        for (const fn of set) fn(event);
      }
    }
  }

  const { load, context } = createModuleLoader();
  const mockWindow = {
    RTCPeerConnection: MockOriginalRTCPeerConnection
  };

  const { installWebRTCSpoof } = load('../src/injected/webrtc');
  installWebRTCSpoof({ enabled: true, policy: 'disable_non_proxied_udp' }, mockWindow);

  const pc = new mockWindow.RTCPeerConnection();
  const receivedCandidates = [];

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      receivedCandidates.push(event.candidate.candidate);
    }
  };

  // 模拟 Edge 真实暴露的 candidates（内网 10.x, TUN 198.18.x, 物理公网 211.83.x, 代理 38.34.x）
  pc.dispatchCandidate('candidate:2205945624 1 udp 2122260223 10.135.174.91 64943 typ host generation 0 ufrag cDh2');
  pc.dispatchCandidate('candidate:1144451645 1 udp 2122194687 198.18.0.1 54833 typ host generation 0 ufrag cDh2');
  pc.dispatchCandidate('candidate:1118984274 1 udp 1686052607 211.83.126.146 64943 typ srflx raddr 10.135.174.91 rport 64943 generation 0 ufrag cDh2');
  pc.dispatchCandidate('candidate:1632583127 1 udp 1685987071 38.34.12.42 44333 typ srflx raddr 38.34.12.42 rport 44333 generation 0 ufrag cDh2');

  // 断言内网和旁路物理 IP 均被拦截
  assert.equal(receivedCandidates.some(c => c.includes('10.135.174.91')), false, 'Host LAN IP must be blocked');
  assert.equal(receivedCandidates.some(c => c.includes('198.18.0.1')), false, 'TUN interface IP must be blocked');
  assert.equal(receivedCandidates.some(c => c.includes('211.83.126.146')), false, 'Physical adapter public IP leak must be blocked');
  assert.equal(receivedCandidates.some(c => c.includes('38.34.12.42')), true, 'Proxy candidate should be allowed');
});

test('SpeechSynthesis protection filters out all Chinese voices', () => {
  const rawSystemVoices = [
    { name: 'Samantha', lang: 'en-US' },
    { name: 'Alex', lang: 'en-US' },
    { name: 'Daniel', lang: 'en-GB' },
    { name: '婷婷', lang: 'zh-CN' },
    { name: 'Eddy (中文（中国大陆）)', lang: 'zh-CN' },
    { name: 'Sin-Ji', lang: 'zh-HK' },
    { name: 'Mei-Jia', lang: 'zh-TW' },
    { name: 'Xiaoxiao', lang: 'zh-CN' }
  ];

  class MockSpeechSynthesis {
    getVoices() {
      return [...rawSystemVoices];
    }
  }

  const { load } = createModuleLoader();
  const mockWin = {
    SpeechSynthesis: MockSpeechSynthesis
  };

  const { installSpeechSpoof } = load('../src/injected/speech');
  installSpeechSpoof(mockWin);

  const synth = new mockWin.SpeechSynthesis();
  const filtered = synth.getVoices();

  assert.equal(filtered.length, 3, 'Should only contain the 3 English voices');
  assert.equal(filtered.some(v => v.lang.startsWith('zh')), false, 'No zh voices allowed');
  assert.equal(filtered.some(v => v.name.includes('婷婷') || v.name.includes('Eddy')), false, 'No Chinese names allowed');
  assert.equal(filtered.map(v => v.name).join(','), 'Samantha,Alex,Daniel');
});

test('Error.stack sanitization cleans extension URLs and script paths', () => {
  const { load, context } = createModuleLoader();
  const { installAntiDetection } = load('../src/injected/anti-detection');

  installAntiDetection();

  const err = new context.Error('Test Stack Probe');
  const stack = err.stack || '';

  assert.equal(stack.includes('chrome-extension://'), false, 'Stack must not leak chrome-extension://');
  assert.equal(stack.includes('injected.js'), false, 'Stack must not leak injected.js');
  assert.equal(stack.includes('VanishMe'), false, 'Stack must not leak VanishMe namespace');
});

test('DEFAULT_CONFIG enables canvas font masking and covers all Chinese fonts', () => {
  const { load } = createModuleLoader();
  const { DEFAULT_CONFIG } = load('../src/shared/defaults');

  assert.equal(DEFAULT_CONFIG.canvas.enabled, true, 'Canvas font spoofing must be enabled by default');
  assert.equal(DEFAULT_CONFIG.canvas.spoofFonts, true);

  const fonts = DEFAULT_CONFIG.canvas.targetFonts;
  assert.ok(fonts.includes('Kaiti SC'), 'Must include Kaiti SC');
  assert.ok(fonts.includes('Yuanti SC'), 'Must include Yuanti SC');
  assert.ok(fonts.includes('PingFang SC'), 'Must include PingFang SC');
  assert.ok(fonts.includes('Hiragino Sans GB'), 'Must include Hiragino Sans GB');
  assert.ok(fonts.includes('Microsoft YaHei'), 'Must include Microsoft YaHei');
  assert.ok(fonts.includes('SimSun'), 'Must include SimSun');
  assert.ok(fonts.length >= 25, 'Should cover 25+ Chinese fonts');
});

test('calculateGeoDistanceKm computes spherical distances correctly', () => {
  const { load } = createModuleLoader();
  const { calculateGeoDistanceKm } = load('../src/leak-test/network');

  const dist = calculateGeoDistanceKm(31.2304, 121.4737, 34.0522, -118.2437);
  assert.ok(dist > 10000 && dist < 11000, `Distance should be ~10400km, got ${dist}`);

  const distSame = calculateGeoDistanceKm(34.0522, -118.2437, 34.0500, -118.2500);
  assert.ok(distSame < 10, 'Nearby coordinates should have distance < 10km');
});

test('hashString produces stable 32-bit hex hash', () => {
  const { load } = createModuleLoader();
  const { hashString } = load('../src/leak-test/fingerprint');

  const h1 = hashString('VanishMe Fingerprint Probe');
  const h2 = hashString('VanishMe Fingerprint Probe');
  const h3 = hashString('Different Value');

  assert.equal(h1, h2, 'Identical inputs must yield identical hash');
  assert.notEqual(h1, h3, 'Different inputs must yield different hash');
  assert.equal(typeof h1, 'string');
  assert.equal(h1.length, 8, 'Hash must be 8-char hex string');
});

test('CHINESE_FONTS_DATABASE covers major Windows and macOS Chinese fonts', () => {
  const { load } = createModuleLoader();
  const { CHINESE_FONTS_DATABASE } = load('../src/leak-test/claude-detector');

  assert.ok(CHINESE_FONTS_DATABASE.includes('Microsoft YaHei'));
  assert.ok(CHINESE_FONTS_DATABASE.includes('SimSun'));
  assert.ok(CHINESE_FONTS_DATABASE.includes('PingFang SC'));
  assert.ok(CHINESE_FONTS_DATABASE.includes('Hiragino Sans GB'));
  assert.ok(CHINESE_FONTS_DATABASE.includes('Source Han Sans CN'));
  assert.ok(CHINESE_FONTS_DATABASE.length >= 30, 'Should cover 30+ Chinese fonts');
});

test('CreepJS-grade anti-detection: illegal invocation and prototype purity', () => {
  const { load, context } = createModuleLoader();
  const { installLanguageSpoof } = load('../src/injected/language');
  const { installAntiDetection } = load('../src/injected/anti-detection');

  class MockNavigator {}
  const mockNavInstance = new MockNavigator();
  const mockWin = {
    Navigator: MockNavigator,
    navigator: mockNavInstance
  };

  installAntiDetection();
  installLanguageSpoof({
    enabled: true,
    language: 'en-US',
    languages: ['en-US', 'en'],
    acceptLanguage: 'en-US,en;q=0.9'
  }, mockWin);

  const desc = Object.getOwnPropertyDescriptor(MockNavigator.prototype, 'language');
  assert.ok(desc && typeof desc.get === 'function', 'Getter must exist on prototype');

  // 1. Illegal invocation check (calling with {} must throw TypeError)
  assert.throws(() => {
    desc.get.call({});
  }, TypeError, 'Calling native getter with {} must throw TypeError: Illegal invocation');

  // 2. Calling with valid navigator instance must succeed
  assert.equal(desc.get.call(mockNavInstance), 'en-US');

  // 3. Native getter is NOT a constructor
  assert.throws(() => {
    new (desc.get)();
  }, TypeError, 'Getter must not be constructible with new');

  // 4. Getter has no .prototype property
  assert.equal('prototype' in desc.get, false, 'Getter must have no prototype property');

  // 5. Getter inherits Function.prototype.toString (no own toString)
  assert.equal(desc.get.toString === desc.get.constructor.prototype.toString, true);
  assert.equal(Object.prototype.hasOwnProperty.call(desc.get, 'toString'), false);

  // 6. Reflect.ownKeys(navigator) does not leak language or languages
  const ownKeys = Reflect.ownKeys(mockNavInstance);
  assert.equal(ownKeys.includes('language'), false, 'language must not be own key of navigator instance');
  assert.equal(ownKeys.includes('languages'), false, 'languages must not be own key of navigator instance');
});

test('WebRTC network evaluation detects and blocks Chinese ISP IPv6 leaks', () => {
  const { load } = createModuleLoader();
  const { evaluateNetworkRisks } = load('../src/leak-test/network');

  const ipInfo = {
    ip: '38.34.12.42',
    countryCode: 'US',
    timezone: 'America/Los_Angeles'
  };

  // 模拟穿透暴露了中国电信 IPv6 (240e:...)
  const webrtcWithChineseIpv6 = {
    supported: true,
    localIps: [],
    publicIps: ['38.34.12.42', '240e:390:800:1234::1'],
    candidates: ['candidate:123 1 udp 12345 240e:390:800:1234::1 54321 typ srflx'],
    hasLeak: true,
    hasLocalLeak: false,
    statusMessage: 'Leaking'
  };

  const checks = evaluateNetworkRisks(ipInfo, webrtcWithChineseIpv6);
  const webrtcCheck = checks.find(c => c.id === 'net-webrtc');

  assert.ok(webrtcCheck, 'WebRTC check must be present');
  assert.equal(webrtcCheck.status, 'fail');
  assert.match(webrtcCheck.actualValue, /中国大陆.*IPv6/);
  assert.match(webrtcCheck.riskDescription, /中国大陆运营商 IPv6/);
});

test('Intl deep multi-dimension scan catches Chinese format indicators', () => {
  const { load } = createModuleLoader();
  const { evaluateChineseRisk } = load('../src/leak-test/claude-detector');

  const mockWinWithChineseListFormat = {
    Intl: {
      DateTimeFormat: class {
        resolvedOptions() { return { timeZone: 'America/Los_Angeles', locale: 'en-US' }; }
        format() { return '10/29/2026'; }
      },
      RelativeTimeFormat: class {
        resolvedOptions() { return { locale: 'zh-CN' }; }
        format() { return '1天前'; }
      },
      ListFormat: class {
        resolvedOptions() { return { locale: 'zh-CN' }; }
        format(arr) { return arr.join('、'); }
      }
    },
    Date: class {
      getTimezoneOffset() { return 420; }
      toString() { return 'Thu Oct 29 2026 10:00:00 GMT-0700 (PDT)'; }
    },
    navigator: {
      language: 'en-US',
      languages: ['en-US', 'en'],
      platform: 'MacIntel'
    }
  };

  const audit = evaluateChineseRisk(mockWinWithChineseListFormat);
  const intlCheck = audit.checks.find(c => c.id === 'claude-intl');

  assert.ok(intlCheck, 'Intl check must be present');
  assert.equal(intlCheck.status, 'fail');
  assert.ok(audit.result.totalRiskPoints > 0, 'Risk points must be added for Chinese Intl leakage');
});
