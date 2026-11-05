import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const transpile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;

// 执行真实模块；只模拟 Chrome 存储、DNR、标签页和配置页面 DOM。
function setup(overrides = {}, url = 'https://example.com/page', URLClass = URL) {
  let stored;
  let rules = [];
  let confirmResult = true;
  const confirmations = [];
  const reloads = [];
  const messages = [];
  const listeners = {};
  const nodes = new Map();
  const makeNode = () => ({
    value: '', checked: false, disabled: false, textContent: '', children: [], events: {},
    classList: { add() {}, remove() {} },
    addEventListener(type, fn) { this.events[type] = fn; },
    append(...items) { this.children.push(...items); },
    appendChild(item) { this.children.push(item); },
    replaceChildren(...items) { this.children = items; }
  });
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, makeNode());
    return nodes.get(id);
  };
  node('domainScope').value = 'exact';
  const chrome = {
    storage: {
      local: {
        get: async () => ({ bpg_config: structuredClone(stored) }),
        set: async values => { stored = structuredClone(values.bpg_config); }
      },
      onChanged: { addListener(fn) { listeners.storage = fn; } }
    },
    tabs: { query: async () => [{ id: 1, url }], reload: async id => { reloads.push(id); } },
    declarativeNetRequest: {
      RuleActionType: { MODIFY_HEADERS: 'modifyHeaders', ALLOW: 'allow' },
      HeaderOperation: { SET: 'set' },
      getDynamicRules: async () => structuredClone(rules),
      updateDynamicRules: async update => { rules = update.addRules || []; }
    }
  };
  const window = {
    location: { href: url, hostname: new URL(url).hostname },
    addEventListener(type, fn) { listeners[type] = fn; },
    postMessage(data) { messages.push(data); },
    setTimeout() { return 1; }, close() {}
  };
  const context = vm.createContext({
    chrome, window, URL: URLClass, console, structuredClone, clearTimeout() {},
    document: { getElementById: node, querySelectorAll: () => [], createElement: makeNode },
    alert() {}, confirm(message) { confirmations.push(message); return confirmResult; }
  });
  const modules = new Map();
  function load(path) {
    if (path.endsWith('.css')) return {};
    if (!path.endsWith('.ts')) path += '.ts';
    if (modules.has(path)) return modules.get(path).exports;
    const module = { exports: {} };
    modules.set(path, module);
    let source = readFileSync(path, 'utf8');
    if (path.endsWith('/popup.ts')) source += '\nexport { loadConfig, saveChanges, handleDomainRule, handleSiteOverride, renderDomainActions };';
    if (path.endsWith('/options.ts')) source += '\nexport { loadConfig, saveSettings, deleteSiteRule };';
    if (path.endsWith('/context-menu.ts')) source += '\nexport { handleSiteOverride };';
    vm.runInContext(`(function(require,module,exports) {${transpile(source)}\n})`, context)(
      name => load(resolve(dirname(path), name)), module, module.exports
    );
    return module.exports;
  }
  const storage = load(resolve(root, 'src/shared/storage.ts'));
  const defaults = load(resolve(root, 'src/shared/defaults.ts')).DEFAULT_CONFIG;
  stored = { ...structuredClone(defaults), matchMode: 'blacklist', domainList: [], ...overrides };
  const matcher = load(resolve(root, 'src/shared/domain-matcher.ts'));
  const dnr = load(resolve(root, 'src/background/dnr.ts'));
  return {
    storage, matcher, dnr, load, node, window, listeners, messages, reloads, confirmations,
    config: () => structuredClone(stored), rules: () => rules,
    setConfirm: result => { confirmResult = result; },
    async popup() {
      const popup = load(resolve(root, 'src/popup/popup.ts'));
      await popup.loadConfig();
      return popup;
    }
  };
}

// 本扩展的 allow 会压过同级及更低优先级的请求头修改规则。
function headerEnabled(rules, url) {
  const matches = rules.filter(rule => new RegExp(rule.condition.regexFilter, 'i').test(url));
  const allowPriority = Math.max(0, ...matches.filter(rule => rule.action.type === 'allow').map(rule => rule.priority));
  return matches.some(rule => rule.action.type === 'modifyHeaders' && rule.priority > allowPriority);
}

test('精确域名、包含子域名、关键词及 URL 标准化', () => {
  const { matcher } = setup();
  assert.deepEqual(Array.from(matcher.normalizeDomainList(['EXAMPLE.COM', 'https://example.com:443/path', '', '*.Example.com'])), ['example.com', '*.example.com']);
  for (const [pattern, host, expected] of [
    ['example.com', 'example.com', true], ['example.com', 'www.example.com', false],
    ['*.example.com', 'example.com', true], ['*.example.com', 'a.b.example.com', true],
    ['*.example.com', 'evil-example.com', false], ['*.example.com', 'example.com.evil.test', false],
    ['*.www.example.com', 'example.com', false], ['*.www.example.com', 'www.example.com', true],
    ['*example*', 'myexample.net', true], ['example.*', 'example.org', true],
    ['https://EXAMPLE.com/path', 'example.com', true]
  ]) assert.equal(matcher.matchDomain(host, pattern), expected, `${pattern} / ${host}`);
});

for (const mode of ['global', 'whitelist', 'blacklist']) {
  test(`${mode} 下页面与请求头的匹配范围、站点例外和验证码豁免一致`, async () => {
    for (const pattern of ['example.com', '*.example.com', '*example*', 'example.*', '*']) {
      const env = setup({ matchMode: mode, domainList: [pattern], siteRules: {
        'enabled.example.com': { enabled: true }, 'disabled.example.com': { enabled: false },
        'hcaptcha.com': { enabled: true }
      } });
      await env.dnr.updateAcceptLanguageRule(await env.storage.getConfig());
      for (const host of ['example.com', 'www.example.com', 'a.b.example.com', 'evil-example.com', 'example.com.evil.test', 'enabled.example.com', 'disabled.example.com', 'sub.disabled.example.com', 'other.test', 'hcaptcha.com', 'api.hcaptcha.com']) {
        const url = `https://${host}:8443/path`;
        const page = await env.storage.getEffectiveConfigForUrl(url);
        assert.equal(headerEnabled(env.rules(), url), page.enabled, `${mode} / ${pattern} / ${host}`);
      }
    }
  });
}

test('空名单不补回检测站；内容脚本与共享配置读取一致', async () => {
  const env = setup({}, 'https://browserscan.net');
  assert.deepEqual(Array.from((await env.storage.getConfig()).domainList), []);
  env.load(resolve(root, 'src/content/content.ts'));
  await env.listeners.message({ source: env.window, data: { type: '__VM_REQ__', nonce: 'test' } });
  assert.equal(env.messages[0].config.enabled, true);
  assert.equal((await env.storage.getEffectiveConfigForUrl('https://browserscan.net')).enabled, true);
  await env.storage.changeDomainRule('browserscan.net', false);
  await env.storage.changeDomainRule('browserscan.net', true);
  assert.deepEqual(Array.from((await env.storage.getConfig()).domainList), []);
});

test('两个域名范围正确添加；去重、标准化删除且不扩大至父域名', async () => {
  const env = setup({}, 'https://www.example.com');
  const popup = await env.popup();
  await env.node('addDomain').events.click();
  assert.deepEqual(env.config().domainList, ['www.example.com']);
  env.node('domainScope').value = 'subdomains';
  popup.renderDomainActions();
  assert.equal(env.node('rulePreview').textContent, '将添加：*.www.example.com');
  await env.node('addDomain').events.click();
  await popup.handleDomainRule('https://WWW.EXAMPLE.com/page', false);
  assert.deepEqual(env.config().domainList, ['www.example.com', '*.www.example.com']);
  await popup.handleDomainRule('WWW.EXAMPLE.COM', true);
  assert.deepEqual(env.config().domainList, ['*.www.example.com']);
});

test('通配符命中逐条显示，取消删除保留规则，确认后只删除选中项', async () => {
  const env = setup({ domainList: ['*.example.com', '*example*'] });
  const popup = await env.popup();
  assert.equal(env.node('matchedRules').children.length, 2);
  assert.equal(env.node('matchedRules').children[0].children[0].textContent, '命中：*.example.com');
  env.setConfirm(false);
  await popup.handleDomainRule('*.example.com', true);
  assert.deepEqual(env.config().domainList, ['*.example.com', '*example*']);
  assert.match(env.confirmations[0], /所有匹配的网站/);
  env.setConfirm(true);
  await popup.handleDomainRule('*.example.com', true);
  assert.deepEqual(env.config().domainList, ['*example*']);
});

for (const mode of ['global', 'whitelist', 'blacklist']) {
  test(`${mode}：右键与弹窗启用/禁用操作一致，并能恢复跟随名单`, async () => {
    const env = setup({ matchMode: mode, domainList: ['*.example.com'] });
    const popup = await env.popup();
    const menu = env.load(resolve(root, 'src/background/context-menu.ts'));
    await menu.handleSiteOverride('https://example.com', true, 1);
    assert.equal((await env.storage.getEffectiveConfigForUrl('https://example.com')).enabled, true);
    await popup.handleSiteOverride(false);
    assert.equal((await env.storage.getEffectiveConfigForUrl('https://example.com')).enabled, false);
    assert.equal(headerEnabled(env.rules(), 'https://example.com/'), false);
    await popup.handleSiteOverride(null);
    assert.equal((await env.storage.getEffectiveConfigForUrl('https://example.com')).enabled, mode !== 'blacklist');
    assert.deepEqual(env.config().domainList, ['*.example.com']);
    assert.equal(env.node('domainActions').hidden, mode === 'global');
  });
}

test('关闭总开关时站点启用不能绕过；特殊页面禁用快捷按钮', async () => {
  const env = setup({ globalEnabled: false });
  const popup = await env.popup();
  await popup.handleSiteOverride(true);
  assert.equal((await env.storage.getEffectiveConfigForUrl('https://example.com')).enabled, false);
  assert.equal(env.rules().length, 0);
  const internal = setup({}, 'chrome://extensions');
  await internal.popup();
  assert.equal(internal.node('enableSite').disabled, true);
  assert.equal(internal.node('addDomain').disabled, true);
});

test('快捷按钮和连续表单保存不会把后台的新地区配置写回旧值', async () => {
  const env = setup();
  const popup = await env.popup();
  const fresh = env.config();
  fresh.timezone.timezone = 'Asia/Tokyo';
  fresh.geolocation.latitude = 35;
  fresh.siteRules['other.test'] = { enabled: false };
  await env.storage.setConfig(fresh);
  await popup.handleDomainRule('example.com', false);
  await popup.handleSiteOverride(false);
  env.node('domainList').value = 'https://EXAMPLE.com/path\nexample.com\n*.example.com';
  await popup.saveChanges();
  env.node('debugMode').checked = true;
  await popup.saveChanges();
  assert.equal(env.config().timezone.timezone, 'Asia/Tokyo');
  assert.equal(env.config().geolocation.latitude, 35);
  assert.deepEqual(env.config().siteRules['other.test'], { enabled: false });
  assert.deepEqual(env.config().domainList, ['example.com', '*.example.com']);
});

test('完整配置页保存名单及删除例外时保留其他页面的新配置', async () => {
  const env = setup({ siteRules: { 'example.com': { enabled: true } } });
  const options = env.load(resolve(root, 'src/options/options.ts'));
  await options.loadConfig();
  const fresh = env.config();
  fresh.timezone.timezone = 'Asia/Tokyo';
  fresh.siteRules['other.test'] = { enabled: false };
  await env.storage.setConfig(fresh);
  options.deleteSiteRule('example.com');
  env.node('domainList').value = 'EXAMPLE.COM\nhttps://example.com/';
  await options.saveSettings();
  assert.equal(env.config().timezone.timezone, 'Asia/Tokyo');
  assert.deepEqual(env.config().siteRules, { 'other.test': { enabled: false } });
  assert.deepEqual(env.config().domainList, ['example.com']);
});

function loadInjected(cached) {
  const calls = [];
  const store = new Map(cached ? [['__vm_cfg__', JSON.stringify(cached)]] : []);
  let listener;
  let request;
  const createElement = () => {};
  const document = { createElement };
  const window = {
    location: { hostname: 'example.com' },
    addEventListener: (_type, fn) => { listener = fn; },
    postMessage: data => { request = data; }
  };
  const context = vm.createContext({ window, document, console, sessionStorage: {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: key => store.delete(key)
  } });
  const stub = {
    isSecurityChallenge: () => false, saveOriginalMethods() {},
    makeNativeFunction: fn => fn, createNativeGetter: (_name, fn) => fn,
    installAntiDetection: () => calls.push('anti'), installLanguageSpoof: () => calls.push('language'), installSpeechSpoof() {}
  };
  const source = transpile(readFileSync(resolve(root, 'src/injected/injected.ts'), 'utf8'));
  vm.runInContext(`(function(require,exports) {${source}\n})`, context)(() => stub, {});
  return {
    calls, store, document, createElement,
    respond: config => listener({ source: window, data: { type: '__VM_RES__', nonce: request.nonce, config } }),
    update: config => listener({ source: window, data: { type: '__VM_UPDATE__', config } })
  };
}

const ENABLED = { enabled: true, language: { enabled: true } };

test('已启用站点的缓存在握手前同步安装伪装，避免早期脚本读到真实环境', () => {
  const page = loadInjected(ENABLED);
  assert.deepEqual(page.calls, ['anti', 'language']);
  assert.notEqual(page.document.createElement, page.createElement);
});

test('没有缓存或缓存未启用时不提前安装，禁用站点不安装 iframe 钩子', () => {
  for (const cached of [null, { enabled: false, language: { enabled: true } }]) {
    const page = loadInjected(cached);
    assert.deepEqual(page.calls, []);
    page.respond({ enabled: false });
    assert.deepEqual(page.calls, []);
    assert.equal(page.document.createElement, page.createElement);
    page.update(ENABLED);
    assert.deepEqual(page.calls, ['anti', 'language']);
  }
});

test('站点被禁用时清除缓存，启用时写入缓存', () => {
  const page = loadInjected(ENABLED);
  page.respond({ enabled: false });
  assert.equal(page.store.has('__vm_cfg__'), false);
  assert.deepEqual(loadInjected(null).calls, []);
  page.update(ENABLED);
  assert.equal(JSON.parse(page.store.get('__vm_cfg__')).enabled, true);
});

test('非法规则被跳过，不影响其余规则、页面判断和请求头规则', async () => {
  const env = setup({ matchMode: 'blacklist', domainList: ['[bad', 'blocked.com'] });
  assert.equal(env.matcher.normalizeDomain('[bad'), '');
  assert.deepEqual(Array.from(env.matcher.normalizeDomainList(['[bad', 'blocked.com'])), ['blocked.com']);
  assert.equal(env.matcher.matchDomain('example.com', '[bad'), false);
  assert.equal(env.matcher.shouldEnableSpoofing('example.com', 'blacklist', ['[bad']), true);
  assert.equal(env.matcher.shouldEnableSpoofing('blocked.com', 'blacklist', ['[bad', 'blocked.com']), false);
  await env.dnr.updateAcceptLanguageRule(await env.storage.getConfig());
  assert.equal(headerEnabled(env.rules(), 'https://example.com/'), true);
  assert.equal(headerEnabled(env.rules(), 'https://blocked.com/'), false);
  await env.storage.changeDomainRule('[bad', false);
  assert.deepEqual(env.config().domainList, ['blocked.com']);
});


test('URL 编码星号时仍保留通配符，两个页面能显示并保存已有 %2A 规则', async () => {
  // 模拟会将 hostname 中星号百分号编码的 URL 实现，无需启动浏览器。
  class EncodedStarURL extends URL {
    get hostname() { return super.hostname.replace(/\*/g, '%2A'); }
  }
  const env = setup({ domainList: ['%2a.example.com', '%2Aexample%2A'] }, undefined, EncodedStarURL);
  assert.equal(env.matcher.normalizeDomain('*.example.com'), '*.example.com');
  assert.equal(env.matcher.normalizeDomain('*example*'), '*example*');
  assert.equal(env.matcher.matchDomain('example.com', '%2a.example.com'), true);
  assert.equal(env.matcher.matchDomain('www.example.com', '%2A.example.com'), true);
  assert.equal(env.matcher.matchDomain('myexample.net', '%2Aexample%2A'), true);
  await env.dnr.updateAcceptLanguageRule(await env.storage.getConfig());
  assert.equal(headerEnabled(env.rules(), 'https://www.example.com/'), false);
  const popup = await env.popup();
  assert.equal(env.node('domainList').value, '*.example.com\n*example*');
  await popup.saveChanges();
  assert.deepEqual(env.config().domainList, ['*.example.com', '*example*']);
  await env.storage.setConfig({ ...env.config(), domainList: ['%2a.example.com'] });
  const options = env.load(resolve(root, 'src/options/options.ts'));
  await options.loadConfig();
  assert.equal(env.node('domainList').value, '*.example.com');
  await options.saveSettings();
  assert.deepEqual(env.config().domainList, ['*.example.com']);
});
