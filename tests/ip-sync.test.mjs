import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const alarmName = 'vanishme-check-exit-ip';
const lastIPKey = 'vanishme_last_synced_ip';
const exitIP = '203.0.113.10';
const location = {
  success: true, ip: exitIP, latitude: 35.6895, longitude: 139.6917,
  timezone: 'Asia/Tokyo', timezone_gmtOffset: 32400, country_code: 'JP'
};
const clone = value => value === undefined ? undefined : structuredClone(value);
const response = data => ({ ok: true, json: async () => clone(data) });
const drain = async () => {
  for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve));
};
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

// Load the real TypeScript modules in a fresh context for each test. Only Chrome
// APIs and the IP service are replaced; config merging and sync logic run as shipped.
function setup(overrides = {}, storedIP) {
  const data = {};
  const requests = [];
  const writes = [];
  const alarms = new Map();
  const alarmCreates = [];
  const storageListeners = [];
  const alarmListeners = [];
  const errors = [];
  const timeouts = [];
  let fetchImpl = url => response(url.includes('?objects=ip') ? { ip: exitIP } : location);
  let failWrite = false;
  let createGate;
  const chrome = {
    storage: {
      local: {
        get: async key => ({ [key]: clone(data[key]) }),
        set: async values => {
          if (failWrite) throw new Error('Storage unavailable');
          const changes = {};
          for (const [key, value] of Object.entries(values)) {
            if (!isDeepStrictEqual(data[key], value)) {
              changes[key] = { oldValue: clone(data[key]), newValue: clone(value) };
            }
            data[key] = clone(value);
          }
          writes.push(clone(values));
          if (Object.keys(changes).length) storageListeners.forEach(fn => fn(changes, 'local'));
        },
        remove: async key => { delete data[key]; }
      },
      onChanged: { addListener: fn => storageListeners.push(fn) }
    },
    alarms: {
      get: async name => clone(alarms.get(name)),
      create: async (name, info) => {
        if (createGate) await createGate.promise;
        alarmCreates.push(name);
        alarms.set(name, { name, ...info });
      },
      clear: async name => alarms.delete(name),
      onAlarm: { addListener: fn => alarmListeners.push(fn) }
    }
  };
  const context = vm.createContext({
    chrome, AbortController, Intl, clearTimeout,
    setTimeout: (fn, delay) => { timeouts.push(fn); return setTimeout(fn, delay); },
    console: { warn: (...args) => errors.push(args), error: (...args) => errors.push(args) },
    fetch: async (url, options) => {
      requests.push({ url, signal: options.signal });
      return fetchImpl(url, options);
    }
  });
  const modules = new Map();
  function load(path) {
    path = path.endsWith('.ts') ? path : `${path}.ts`;
    if (modules.has(path)) return modules.get(path).exports;
    const module = { exports: {} };
    modules.set(path, module);
    const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    });
    const run = new vm.Script(`(function(require, module, exports) {${outputText}\n})`, { filename: path });
    run.runInContext(context)(name => load(resolve(dirname(path), name)), module, module.exports);
    return module.exports;
  }
  const { DEFAULT_CONFIG } = load(resolve(root, 'src/shared/defaults.ts'));
  data.bpg_config = { ...clone(DEFAULT_CONFIG), ...clone(overrides) };
  if (storedIP) data[lastIPKey] = storedIP;
  const sync = load(resolve(root, 'src/background/ip-sync.ts'));
  return {
    ...sync, data, requests, writes, alarms, alarmCreates, errors,
    storage: load(resolve(root, 'src/shared/storage.ts')),
    setFetch: fn => { fetchImpl = fn; },
    failWrites: value => { failWrite = value; },
    expireRequest: () => timeouts.at(-1)(),
    blockAlarmCreation: () => { createGate = deferred(); return createGate; },
    update: async patch => {
      await chrome.storage.local.set({ bpg_config: { ...clone(data.bpg_config), ...patch } });
      await drain();
    },
    fireAlarm: async (name = alarmName) => {
      alarmListeners.forEach(fn => fn({ name }));
      await drain();
    }
  };
}

test('fresh and legacy configs default off, with no lookup or background alarm', async () => {
  for (const legacy of [false, true]) {
    const h = setup();
    if (legacy) delete h.data.bpg_config.autoIPSync;
    assert.equal((await h.storage.getConfig()).autoIPSync, false);
    h.alarms.set(alarmName, { periodInMinutes: 5 });
    await h.ensureIPCheckAlarm();
    await h.checkExitIP();
    await h.fireAlarm();
    assert.equal(h.alarms.size, 0);
    assert.equal(h.requests.length, 0);
    assert.equal(h.writes.length, 0);
  }
});

test('global protection off suppresses sync even if auto sync is enabled', async () => {
  const h = setup({ globalEnabled: false, autoIPSync: true });
  await h.ensureIPCheckAlarm();
  await h.checkExitIP();
  assert.equal(h.requests.length, 0);
  assert.equal(h.alarms.size, 0);
});

test('enabled sync uses a five-minute alarm and preserves unrelated settings and module switches', async () => {
  const h = setup({ autoIPSync: true, matchMode: 'blacklist', debugMode: true });
  h.data.bpg_config.geolocation.enabled = false;
  h.data.bpg_config.timezone.enabled = false;
  h.data.bpg_config.language.enabled = false;
  const before = clone(h.data.bpg_config);
  await h.ensureIPCheckAlarm();
  await h.ensureIPCheckAlarm();
  assert.equal(h.alarms.get(alarmName).periodInMinutes, 5);
  assert.equal(h.alarmCreates.length, 1);
  await h.checkExitIP();
  const config = h.data.bpg_config;
  assert.equal(config.geolocation.latitude, location.latitude);
  assert.equal(config.geolocation.longitude, location.longitude);
  assert.equal(config.timezone.timezone, 'Asia/Tokyo');
  assert.equal(config.timezone.offsetMinutes, -540);
  assert.equal(config.language.acceptLanguage, 'ja-JP,ja;q=0.9');
  assert.equal(config.profile.activeProfileId, null);
  for (const key of ['geolocation', 'timezone', 'language']) assert.equal(config[key].enabled, false);
  for (const key of ['webrtc', 'canvas', 'domainList', 'siteRules', 'matchMode', 'debugMode']) {
    assert.deepEqual(config[key], before[key]);
  }
  assert.equal(h.data[lastIPKey], exitIP);
  assert.equal(h.requests[1].url, `https://ipwhois.app/json/${exitIP}`);
});

test('unchanged IP skips region lookup and writes; a changed IP updates settings', async () => {
  const h = setup({ autoIPSync: true }, exitIP);
  await h.checkExitIP();
  assert.equal(h.requests.length, 1);
  assert.equal(h.writes.length, 0);
  h.setFetch(url => response(url.includes('?objects=ip')
    ? { ip: '203.0.113.11' } : { ...location, ip: '203.0.113.11' }));
  await h.checkExitIP();
  assert.equal(h.data[lastIPKey], '203.0.113.11');
  assert.equal(h.writes.length, 1);
});

test('failed or invalid lookup preserves settings and can retry', async t => {
  const cases = {
    network: () => { throw new Error('Offline'); },
    http: () => ({ ok: false, status: 503 }),
    missingIP: () => response({}),
    failedLocation: { success: false },
    wrongIP: { ip: '203.0.113.99' },
    badLatitude: { latitude: 91 },
    badLongitude: { longitude: -181 },
    badTimezone: { timezone: 'Invalid/Timezone' },
    badOffset: { timezone_gmtOffset: '32400' }
  };
  for (const [name, failure] of Object.entries(cases)) {
    await t.test(name, async () => {
      const h = setup({ autoIPSync: true });
      const before = clone(h.data.bpg_config);
      h.setFetch(typeof failure === 'function' ? failure : url => response(
        url.includes('?objects=ip') ? { ip: exitIP } : { ...location, ...failure }
      ));
      await h.checkExitIP();
      assert.deepEqual(h.data.bpg_config, before);
      assert.equal(h.data[lastIPKey], undefined);
      assert.equal(h.writes.length, 0);
      h.setFetch(url => response(url.includes('?objects=ip') ? { ip: exitIP } : location));
      await h.checkExitIP();
      assert.equal(h.data[lastIPKey], exitIP);
    });
  }
});

test('storage write failure does not advance the synced IP', async () => {
  const h = setup({ autoIPSync: true });
  const before = clone(h.data.bpg_config);
  h.failWrites(true);
  await h.checkExitIP();
  assert.deepEqual(h.data.bpg_config, before);
  assert.equal(h.data[lastIPKey], undefined);
  h.failWrites(false);
  await h.checkExitIP();
  assert.equal(h.data[lastIPKey], exitIP);
});

test('concurrent startup/alarm checks share one lookup', async () => {
  const h = setup({ autoIPSync: true });
  const pending = deferred();
  h.setFetch(url => url.includes('?objects=ip') ? pending.promise : response(location));
  const first = h.checkExitIP();
  await drain();
  await h.checkExitIP();
  assert.equal(h.requests.length, 1);
  pending.resolve(response({ ip: exitIP }));
  await first;
  assert.equal(h.writes.length, 1);
});

test('enabling triggers immediate sync even for a previously synced IP', async () => {
  const h = setup({}, exitIP);
  await h.update({ autoIPSync: true });
  assert.equal(h.data.bpg_config.timezone.timezone, 'Asia/Tokyo');
  assert.equal(h.alarms.get(alarmName).periodInMinutes, 5);
  assert.equal(h.requests.length, 2);
  await h.update({ autoIPSync: false });
  assert.equal(h.alarms.size, 0);
  const count = h.requests.length;
  await h.fireAlarm();
  assert.equal(h.requests.length, count);
});

for (const disabled of [{ autoIPSync: false }, { globalEnabled: false }]) {
  test(`disabling ${Object.keys(disabled)[0]} aborts in-flight lookup and rejects late results`, async () => {
    const h = setup({ autoIPSync: true });
    const pending = deferred();
    h.setFetch(url => url.includes('?objects=ip') ? response({ ip: exitIP }) : pending.promise);
    const checking = h.checkExitIP();
    await drain();
    assert.equal(h.requests.length, 2);
    await h.update(disabled);
    assert.equal(h.requests[1].signal.aborted, true);
    const before = clone(h.data.bpg_config);
    // Intentionally ignore abort in this mock to simulate an already delivered response.
    pending.resolve(response(location));
    await checking;
    assert.deepEqual(h.data.bpg_config, before);
    assert.equal(h.data[lastIPKey], undefined);
    assert.equal(h.alarms.size, 0);
  });
}

test('rapid off/on ignores the old response without cancelling the new check', async () => {
  const h = setup({ autoIPSync: true });
  const old = deferred();
  const current = deferred();
  let regionRequests = 0;
  h.setFetch(url => url.includes('?objects=ip') ? response({ ip: exitIP })
    : (++regionRequests === 1 ? old.promise : current.promise));
  const first = h.checkExitIP();
  await drain();
  await h.update({ autoIPSync: false });
  await h.update({ autoIPSync: true });
  old.resolve(response({ ...location, latitude: 0 }));
  await first;
  await h.checkExitIP();
  assert.equal(h.requests.length, 4);
  current.resolve(response(location));
  await drain();
  assert.equal(h.data.bpg_config.geolocation.latitude, location.latitude);
  assert.equal(h.data[lastIPKey], exitIP);
});

test('re-enabling after a failed lookup retries the same IP on the next alarm', async () => {
  const h = setup({}, exitIP);
  h.setFetch(() => { throw new Error('Offline'); });
  await h.update({ autoIPSync: true });
  assert.equal(h.data[lastIPKey], undefined);
  h.setFetch(url => response(url.includes('?objects=ip') ? { ip: exitIP } : location));
  await h.fireAlarm('unrelated-alarm');
  assert.equal(h.requests.length, 1);
  await h.fireAlarm();
  assert.equal(h.data[lastIPKey], exitIP);
});

test('a timed-out request preserves config and releases the check for retry', async () => {
  const h = setup({ autoIPSync: true });
  const before = clone(h.data.bpg_config);
  h.setFetch((url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Request aborted')));
  }));
  const checking = h.checkExitIP();
  await drain();
  h.expireRequest();
  await checking;
  assert.deepEqual(h.data.bpg_config, before);
  assert.equal(h.data[lastIPKey], undefined);
  h.setFetch(url => response(url.includes('?objects=ip') ? { ip: exitIP } : location));
  await h.checkExitIP();
  assert.equal(h.data[lastIPKey], exitIP);
});

test('disabling during alarm creation clears the late-created alarm', async () => {
  const h = setup({ autoIPSync: true });
  const gate = h.blockAlarmCreation();
  const creating = h.ensureIPCheckAlarm();
  await drain();
  await h.update({ autoIPSync: false });
  gate.resolve();
  await creating;
  await drain();
  assert.equal(h.alarmCreates.length, 1);
  assert.equal(h.alarms.size, 0);
  assert.equal(h.requests.length, 0);
});
