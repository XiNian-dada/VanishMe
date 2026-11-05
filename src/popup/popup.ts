import './popup.css';
import { getConfig, setConfig, resetConfig, applyProfile, saveConfigChanges, setSiteEnabled, changeDomainRule } from '../shared/storage';
import { updateAcceptLanguageRule } from '../background/dnr';
import { DEFAULT_CONFIG } from '../shared/defaults';
import type { PrivacyConfig, GeolocationHistory } from '../shared/types';

import { matchDomain, normalizeDomain, isSiteEnabled, normalizeDomainList } from '../shared/domain-matcher';

// DOM elements
const globalEnabledEl = document.getElementById('globalEnabled') as HTMLInputElement;
const autoIPSyncEl = document.getElementById('autoIPSync') as HTMLInputElement;
const debugModeEl = document.getElementById('debugMode') as HTMLInputElement;
const globalStatusEl = document.getElementById('globalStatus') as HTMLElement;
const currentSiteEl = document.getElementById('currentSite') as HTMLElement;
const enableSiteBtn = document.getElementById('enableSite') as HTMLButtonElement;
const disableSiteBtn = document.getElementById('disableSite') as HTMLButtonElement;

const matchModeEl = document.getElementById('matchMode') as HTMLSelectElement;
const domainListEl = document.getElementById('domainList') as HTMLTextAreaElement;
const domainScopeEl = document.getElementById('domainScope') as HTMLSelectElement;
const addDomainBtn = document.getElementById('addDomain') as HTMLButtonElement;
const domainActionsEl = document.getElementById('domainActions') as HTMLElement;
const rulePreviewEl = document.getElementById('rulePreview') as HTMLElement;
const matchedRulesEl = document.getElementById('matchedRules') as HTMLElement;
const siteRuleStatusEl = document.getElementById('siteRuleStatus') as HTMLElement;
const followSiteBtn = document.getElementById('followSite') as HTMLButtonElement;


const openOptionsHeaderBtn = document.getElementById('openOptionsHeader') as HTMLButtonElement;

const geolocationEnabledEl = document.getElementById('geolocationEnabled') as HTMLInputElement;
const latitudeEl = document.getElementById('latitude') as HTMLInputElement;
const longitudeEl = document.getElementById('longitude') as HTMLInputElement;
const accuracyEl = document.getElementById('accuracy') as HTMLInputElement;
const randomizeEl = document.getElementById('randomize') as HTMLInputElement;
const randomRadiusMetersEl = document.getElementById('randomRadiusMeters') as HTMLInputElement;
const spoofPermissionEl = document.getElementById('spoofPermission') as HTMLInputElement;
const saveCoordinateBtn = document.getElementById('saveCoordinate') as HTMLButtonElement;
const getFromIPBtn = document.getElementById('getFromIP') as HTMLButtonElement;

const timezoneEnabledEl = document.getElementById('timezoneEnabled') as HTMLInputElement;
const timezoneEl = document.getElementById('timezone') as HTMLInputElement;
const utcOffsetEl = document.getElementById('utcOffset') as HTMLInputElement;

const languageEnabledEl = document.getElementById('languageEnabled') as HTMLInputElement;
const languageEl = document.getElementById('language') as HTMLInputElement;
const languagesEl = document.getElementById('languages') as HTMLInputElement;
const acceptLanguageEl = document.getElementById('acceptLanguage') as HTMLInputElement;

const webrtcEnabledEl = document.getElementById('webrtcEnabled') as HTMLInputElement;
const webrtcPolicyEl = document.getElementById('webrtcPolicy') as HTMLSelectElement;

const canvasEnabledEl = document.getElementById('canvasEnabled') as HTMLInputElement;
const resetFontsBtn = document.getElementById('resetFonts') as HTMLButtonElement;

const saveBtn = document.getElementById('save') as HTMLButtonElement;
const openOptionsBtn = document.getElementById('openOptions') as HTMLButtonElement;
const openLeakTestBtn = document.getElementById('openLeakTest') as HTMLButtonElement;
const resetBtn = document.getElementById('reset') as HTMLButtonElement;
const autoSaveToast = document.getElementById('autoSaveToast') as HTMLElement;

let currentConfig: PrivacyConfig;
let savedConfig: PrivacyConfig;
let currentHostname: string = '';
let autoSaveTimer: number | null = null;

function showAutoSaveToast() {
  // Clear existing timer
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  // Show toast
  autoSaveToast.classList.add('show');

  // Hide after 2 seconds
  autoSaveTimer = window.setTimeout(() => {
    autoSaveToast.classList.remove('show');
    autoSaveTimer = null;
  }, 2000);
}

async function loadConfig() {
  currentConfig = await getConfig();
  savedConfig = structuredClone(currentConfig);

  currentHostname = '';
  // Get current tab hostname
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      const url = new URL(tab.url);
      currentHostname = ['http:', 'https:'].includes(url.protocol) ? url.hostname : '';
      currentSiteEl.textContent = currentHostname;
    }
  } catch (error) {
    currentSiteEl.textContent = 'N/A';
  }

  currentSiteEl.textContent = currentHostname || '不支持当前页面';

  // Populate UI
  globalEnabledEl.checked = currentConfig.globalEnabled;
  autoIPSyncEl.checked = currentConfig.autoIPSync;
  debugModeEl.checked = currentConfig.debugMode || false;
  updateGlobalStatus();

  // Match mode
  matchModeEl.value = currentConfig.matchMode || 'global';
  domainListEl.value = normalizeDomainList(currentConfig.domainList || []).join('\n');

  // Geolocation
  geolocationEnabledEl.checked = currentConfig.geolocation.enabled;
  latitudeEl.value = currentConfig.geolocation.latitude.toString();
  longitudeEl.value = currentConfig.geolocation.longitude.toString();
  accuracyEl.value = currentConfig.geolocation.accuracy.toString();
  randomizeEl.checked = currentConfig.geolocation.randomize;
  randomRadiusMetersEl.value = currentConfig.geolocation.randomRadiusMeters.toString();
  spoofPermissionEl.checked = currentConfig.geolocation.spoofPermission;

  // Timezone
  timezoneEnabledEl.checked = currentConfig.timezone.enabled;
  timezoneEl.value = currentConfig.timezone.timezone;
  // Convert offsetMinutes to hours for display
  const utcOffsetHours = -currentConfig.timezone.offsetMinutes / 60;
  utcOffsetEl.value = utcOffsetHours.toString();

  // Language
  languageEnabledEl.checked = currentConfig.language.enabled;
  languageEl.value = currentConfig.language.language;
  languagesEl.value = currentConfig.language.languages.join(', ');
  acceptLanguageEl.value = currentConfig.language.acceptLanguage;

  // WebRTC
  webrtcEnabledEl.checked = currentConfig.webrtc.enabled;
  webrtcPolicyEl.value = currentConfig.webrtc.policy;

  // Canvas
  canvasEnabledEl.checked = currentConfig.canvas.enabled;
  renderDomainActions();
}

function updateGlobalStatus() {
  globalStatusEl.textContent = globalEnabledEl.checked ? '全局保护已启用' : '全局保护已禁用';
}

async function saveToggle(key: 'globalEnabled' | 'autoIPSync', enabled: boolean) {
  try {
    // 后台同步可能已更新地区；切换开关只修改对应字段，不写回旧表单。
    const config = await getConfig();
    await setConfig({ ...config, [key]: enabled });
    await loadConfig();
    showAutoSaveToast();
  } catch (error) {
    console.error('Failed to save toggle:', error);
    alert('保存配置失败');
  }
}

// 串行保存失焦事件，避免点击快捷按钮时旧表单仍在写入。
let pendingSave = Promise.resolve();
function saveChanges(): Promise<void> {
  pendingSave = pendingSave.then(saveForm);
  return pendingSave;
}

async function saveForm() {
  try {
    // Parse domain list
    const domainListArray = normalizeDomainList(domainListEl.value.split('\n'));

    // Parse languages
    const languagesArray = languagesEl.value
      .split(',')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    // Validate inputs
    const lat = parseFloat(latitudeEl.value);
    const lon = parseFloat(longitudeEl.value);
    const acc = parseFloat(accuracyEl.value);
    const utcOffsetHours = parseFloat(utcOffsetEl.value);

    if (lat < -90 || lat > 90) {
      alert('纬度必须在 -90 到 90 之间');
      return;
    }
    if (lon < -180 || lon > 180) {
      alert('经度必须在 -180 到 180 之间');
      return;
    }
    if (acc <= 0) {
      alert('精度必须大于 0');
      return;
    }
    if (utcOffsetHours < -12 || utcOffsetHours > 14) {
      alert('UTC 偏移必须在 -12 到 +14 小时之间');
      return;
    }

    // Convert UTC offset hours to offsetMinutes (note the sign reversal)
    // UTC-7 (Los Angeles) = -7 hours = +420 minutes offset
    // UTC+8 (Singapore) = +8 hours = -480 minutes offset
    const offsetMinutes = -utcOffsetHours * 60;

    currentConfig.globalEnabled = globalEnabledEl.checked;
    currentConfig.autoIPSync = autoIPSyncEl.checked;
    currentConfig.debugMode = debugModeEl.checked;
    currentConfig.matchMode = matchModeEl.value as 'global' | 'whitelist' | 'blacklist';
    currentConfig.domainList = domainListArray;

    currentConfig.geolocation.enabled = geolocationEnabledEl.checked;
    currentConfig.geolocation.latitude = lat;
    currentConfig.geolocation.longitude = lon;
    currentConfig.geolocation.accuracy = acc;
    currentConfig.geolocation.randomize = randomizeEl.checked;
    currentConfig.geolocation.randomRadiusMeters = parseFloat(randomRadiusMetersEl.value);
    currentConfig.geolocation.spoofPermission = spoofPermissionEl.checked;

    currentConfig.timezone.enabled = timezoneEnabledEl.checked;
    currentConfig.timezone.timezone = timezoneEl.value;
    currentConfig.timezone.offsetMinutes = offsetMinutes;

    currentConfig.language.enabled = languageEnabledEl.checked;
    currentConfig.language.language = languageEl.value;
    currentConfig.language.languages = languagesArray;
    currentConfig.language.acceptLanguage = acceptLanguageEl.value;

    currentConfig.webrtc.enabled = webrtcEnabledEl.checked;
    currentConfig.webrtc.policy = webrtcPolicyEl.value as any;

    currentConfig.canvas.enabled = canvasEnabledEl.checked;

    await saveConfigChanges(savedConfig, currentConfig);
    savedConfig = structuredClone(currentConfig);
    domainListEl.value = currentConfig.domainList.join('\n');

    renderDomainActions();
    // Show toast
    showAutoSaveToast();

    // Don't auto-reload - let user refresh manually or close popup
  } catch (error) {
    console.error('Failed to save config:', error);
    alert('保存配置失败');
  }
}

async function handleApplyProfile(profileId: string) {
  if (!profileId) return;

  if (!confirm('应用此配置会覆盖当前设置，确定继续吗？')) {
    return;
  }

  try {
    await applyProfile(profileId);
    await loadConfig();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.reload(tab.id);
    }

    window.close();
  } catch (error) {
    console.error('Failed to apply profile:', error);
    alert('应用配置失败');
  }
}

/** 展示本次添加范围，以及当前网站实际命中的每一条规则。 */
function renderDomainActions() {
  const isGlobal = matchModeEl.value === 'global';
  domainActionsEl.hidden = isGlobal;
  const pattern = domainScopeEl.value === 'subdomains' ? `*.${currentHostname}` : currentHostname;
  rulePreviewEl.textContent = currentHostname ? `将添加：${pattern}` : '仅支持 HTTP / HTTPS 网站';
  addDomainBtn.textContent = matchModeEl.value === 'blacklist' ? '添加到黑名单' : '添加到白名单';
  addDomainBtn.disabled = !currentHostname || currentConfig.domainList.some(item => normalizeDomain(item) === pattern);
  matchedRulesEl.replaceChildren();
  for (const rule of normalizeDomainList(currentConfig.domainList).filter(item => matchDomain(currentHostname, item))) {
    const row = document.createElement('div');
    row.className = 'matched-rule';
    const label = document.createElement('span');
    label.textContent = `命中：${rule}`;
    const remove = document.createElement('button');
    remove.className = 'btn-secondary btn-sm';
    remove.textContent = '移除规则';
    remove.onclick = () => handleDomainRule(rule, true);
    row.append(label, remove);
    matchedRulesEl.appendChild(row);
  }
  const override = currentConfig.siteRules[currentHostname];
  const enabled = isSiteEnabled(currentHostname, currentConfig);
  siteRuleStatusEl.textContent = `当前${enabled ? '启用' : '不启用'}伪装。${override ? `站点例外：${override.enabled ? '启用' : '不启用'}，优先于名单。` : '跟随匹配模式和名单。'}${!currentConfig.globalEnabled ? '全局保护已关闭。' : ''}`;
  enableSiteBtn.disabled = !currentHostname;
  disableSiteBtn.disabled = !currentHostname;
  followSiteBtn.disabled = !currentHostname || !override;
}

/** 名单与站点例外独立操作，通配符只在用户明确确认后删除。 */
async function handleDomainRule(pattern: string, remove: boolean) {
  if (!currentHostname) return;
  if (remove && pattern.includes('*') && !confirm(`移除规则 ${pattern}？这会影响所有匹配的网站，不只是当前网站。`)) return;
  await pendingSave;
  const config = await changeDomainRule(pattern, remove);
  currentConfig.domainList = config.domainList;
  savedConfig.domainList = [...config.domainList];
  currentConfig.siteRules = config.siteRules;
  savedConfig.siteRules = structuredClone(config.siteRules);
  domainListEl.value = config.domainList.join('\n');
  renderDomainActions();
  await refreshSite(config);
}

/** 与右键菜单一致：只更新当前域名的例外，不偷偷修改通配符。 */
async function handleSiteOverride(enabled: boolean | null) {
  if (!currentHostname) return;
  await pendingSave;
  const config = await setSiteEnabled(currentHostname, enabled);
  currentConfig.siteRules = config.siteRules;
  savedConfig.siteRules = structuredClone(config.siteRules);
  renderDomainActions();
  await refreshSite(config);
}

async function refreshSite(config: PrivacyConfig) {
  // 等请求头规则同步完再刷新，以新配置重新安装页面钩子。
  await updateAcceptLanguageRule(config);
  showAutoSaveToast();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id !== undefined) await chrome.tabs.reload(tab.id);
}

async function handleSaveCoordinate() {
  const lat = parseFloat(latitudeEl.value);
  const lon = parseFloat(longitudeEl.value);
  const acc = parseFloat(accuracyEl.value);

  if (isNaN(lat) || isNaN(lon) || isNaN(acc)) {
    alert('无效的坐标');
    return;
  }

  const history: GeolocationHistory = {
    latitude: lat,
    longitude: lon,
    accuracy: acc,
    createdAt: Date.now()
  };

  // Keep only last 10 unique coordinates
  const existingHistory = currentConfig.geolocation.history || [];
  const isDuplicate = existingHistory.some(
    h => h.latitude === lat && h.longitude === lon
  );

  if (!isDuplicate) {
    existingHistory.unshift(history);
    currentConfig.geolocation.history = existingHistory.slice(0, 10);
    await setConfig(currentConfig);

    // Auto-save and reload
    await saveChanges();
  }
}

function handleOpenLeakTest() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('leak-test/leak-test.html')
  });
}

function handleOpenOptions() {
  chrome.runtime.openOptionsPage();
}

async function handleReset() {
  if (confirm('重置所有设置为默认值？')) {
    await resetConfig();
    await loadConfig();
  }
}

async function handleGetFromIP() {
  try {
    getFromIPBtn.disabled = true;
    getFromIPBtn.textContent = '获取中...';

    // Use ipwhois.app API (free, no API key required)
    const response = await fetch('https://ipwhois.app/json/');
    if (!response.ok) {
      throw new Error('Failed to fetch IP info');
    }

    const data = await response.json();

    if (!data.success || !data.latitude || !data.longitude) {
      throw new Error('No location data in response');
    }

    // 1. Fill geolocation
    latitudeEl.value = data.latitude.toString();
    longitudeEl.value = data.longitude.toString();
    geolocationEnabledEl.checked = true;

    // 2. Fill timezone
    if (data.timezone) {
      timezoneEl.value = data.timezone;
      timezoneEnabledEl.checked = true;

      // Calculate offset from timezone_gmtOffset (in seconds)
      // timezone_gmtOffset = -25200 (LA, UTC-7) -> -25200 / 3600 = -7
      const utcOffsetHours = data.timezone_gmtOffset / 3600;
      utcOffsetEl.value = utcOffsetHours.toString();
    }

    // 3. Fill language based on country code
    if (data.country_code) {
      const languageMap: Record<string, { language: string; languages: string[]; acceptLanguage: string }> = {
        'US': { language: 'en-US', languages: ['en-US', 'en'], acceptLanguage: 'en-US,en;q=0.9' },
        'GB': { language: 'en-GB', languages: ['en-GB', 'en'], acceptLanguage: 'en-GB,en;q=0.9' },
        'CN': { language: 'zh-CN', languages: ['zh-CN', 'zh'], acceptLanguage: 'zh-CN,zh;q=0.9' },
        'JP': { language: 'ja-JP', languages: ['ja-JP', 'ja'], acceptLanguage: 'ja-JP,ja;q=0.9' },
        'KR': { language: 'ko-KR', languages: ['ko-KR', 'ko'], acceptLanguage: 'ko-KR,ko;q=0.9' },
        'DE': { language: 'de-DE', languages: ['de-DE', 'de'], acceptLanguage: 'de-DE,de;q=0.9' },
        'FR': { language: 'fr-FR', languages: ['fr-FR', 'fr'], acceptLanguage: 'fr-FR,fr;q=0.9' },
        'SG': { language: 'en-SG', languages: ['en-SG', 'en'], acceptLanguage: 'en-SG,en;q=0.9' },
        'TW': { language: 'zh-TW', languages: ['zh-TW', 'zh'], acceptLanguage: 'zh-TW,zh;q=0.9' },
        'HK': { language: 'zh-HK', languages: ['zh-HK', 'zh'], acceptLanguage: 'zh-HK,zh;q=0.9' },
      };

      const langConfig = languageMap[data.country_code] || { language: 'en-US', languages: ['en-US', 'en'], acceptLanguage: 'en-US,en;q=0.9' };
      languageEl.value = langConfig.language;
      languagesEl.value = langConfig.languages.join(', ');
      acceptLanguageEl.value = langConfig.acceptLanguage;
      languageEnabledEl.checked = true;
    }

    // 4. Auto-save and reload
    await saveChanges();

    // Show success message (saveChanges will close the popup, so this won't be seen)
    // But if there's an error in saveChanges, at least the form is filled
  } catch (error) {
    console.error('Failed to get config from IP:', error);
    alert('从 IP 获取配置失败，请手动输入或稍后重试');
  } finally {
    getFromIPBtn.disabled = false;
    getFromIPBtn.textContent = '从 IP 自动配置';
  }
}

async function handleResetFonts() {
  try {
    resetFontsBtn.disabled = true;
    resetFontsBtn.textContent = '更新中...';

    // Force update targetFonts to the latest default list
    currentConfig.canvas.targetFonts = DEFAULT_CONFIG.canvas.targetFonts;
    await setConfig(currentConfig);

    // Reload current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.reload(tab.id);
    }

    alert('字体列表已更新！请刷新页面测试。');
  } catch (error) {
    console.error('Failed to reset fonts:', error);
    alert('更新字体列表失败');
  } finally {
    resetFontsBtn.disabled = false;
    resetFontsBtn.textContent = '更新到最新字体列表';
  }
}

// Event listeners
globalEnabledEl.addEventListener('change', () => {
  updateGlobalStatus();
  void saveToggle('globalEnabled', globalEnabledEl.checked);
});
debugModeEl.addEventListener('change', () => saveChanges());
autoIPSyncEl.addEventListener('change', () => { void saveToggle('autoIPSync', autoIPSyncEl.checked); });
matchModeEl.addEventListener('change', () => saveChanges());
domainListEl.addEventListener('blur', () => saveChanges());

domainScopeEl.addEventListener('change', renderDomainActions);
addDomainBtn.addEventListener('click', () => handleDomainRule(
  domainScopeEl.value === 'subdomains' ? `*.${currentHostname}` : currentHostname, false
));
enableSiteBtn.addEventListener('click', () => handleSiteOverride(true));
disableSiteBtn.addEventListener('click', () => handleSiteOverride(false));
followSiteBtn.addEventListener('click', () => handleSiteOverride(null));

geolocationEnabledEl.addEventListener('change', () => saveChanges());
latitudeEl.addEventListener('blur', () => saveChanges());
longitudeEl.addEventListener('blur', () => saveChanges());
accuracyEl.addEventListener('blur', () => saveChanges());
randomizeEl.addEventListener('change', () => saveChanges());
randomRadiusMetersEl.addEventListener('blur', () => saveChanges());
spoofPermissionEl.addEventListener('change', () => saveChanges());

timezoneEnabledEl.addEventListener('change', () => saveChanges());
timezoneEl.addEventListener('blur', () => saveChanges());
utcOffsetEl.addEventListener('blur', () => saveChanges());

languageEnabledEl.addEventListener('change', () => saveChanges());
languageEl.addEventListener('blur', () => saveChanges());
languagesEl.addEventListener('blur', () => saveChanges());
acceptLanguageEl.addEventListener('blur', () => saveChanges());

webrtcEnabledEl.addEventListener('change', () => saveChanges());
webrtcPolicyEl.addEventListener('change', () => saveChanges());

canvasEnabledEl.addEventListener('change', () => saveChanges());

saveCoordinateBtn.addEventListener('click', handleSaveCoordinate);
getFromIPBtn.addEventListener('click', handleGetFromIP);
resetFontsBtn.addEventListener('click', handleResetFonts);
openOptionsBtn.addEventListener('click', handleOpenOptions);
openOptionsHeaderBtn.addEventListener('click', handleOpenOptions);
openLeakTestBtn.addEventListener('click', handleOpenLeakTest);
resetBtn.addEventListener('click', handleReset);

// Profile card click handlers
document.querySelectorAll('.profile-card').forEach(card => {
  card.addEventListener('click', () => {
    const profileId = (card as HTMLElement).dataset.profile;
    if (profileId) {
      handleApplyProfile(profileId);
    }
  });
});

// Initialize
loadConfig();
