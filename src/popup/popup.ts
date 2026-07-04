import './popup.css';
import { getConfig, setConfig, resetConfig, applyProfile } from '../shared/storage';
import { DEFAULT_CONFIG } from '../shared/defaults';
import type { PrivacyConfig, GeolocationHistory } from '../shared/types';

// DOM elements
const globalEnabledEl = document.getElementById('globalEnabled') as HTMLInputElement;
const debugModeEl = document.getElementById('debugMode') as HTMLInputElement;
const globalStatusEl = document.getElementById('globalStatus') as HTMLElement;
const currentSiteEl = document.getElementById('currentSite') as HTMLElement;
const enableSiteBtn = document.getElementById('enableSite') as HTMLButtonElement;
const disableSiteBtn = document.getElementById('disableSite') as HTMLButtonElement;

const matchModeEl = document.getElementById('matchMode') as HTMLSelectElement;
const domainListEl = document.getElementById('domainList') as HTMLTextAreaElement;

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

  // Get current tab hostname
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      currentHostname = new URL(tab.url).hostname;
      currentSiteEl.textContent = currentHostname;
    }
  } catch (error) {
    currentSiteEl.textContent = 'N/A';
  }

  // Populate UI
  globalEnabledEl.checked = currentConfig.globalEnabled;
  debugModeEl.checked = currentConfig.debugMode || false;
  updateGlobalStatus();

  // Match mode
  matchModeEl.value = currentConfig.matchMode || 'global';
  domainListEl.value = (currentConfig.domainList || []).join('\n');

  // Geolocation
  geolocationEnabledEl.checked = currentConfig.geolocation.enabled;
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
}

function updateGlobalStatus() {
  globalStatusEl.textContent = globalEnabledEl.checked ? '全局保护已启用' : '全局保护已禁用';
}

async function saveChanges() {
  try {
    // Parse domain list
    const domainListArray = domainListEl.value
      .split('\n')
      .map(d => d.trim())
      .filter(d => d.length > 0);

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

    await setConfig(currentConfig);

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

async function handleEnableSite() {
  if (!currentHostname) return;

  const domainListArray = domainListEl.value
    .split('\n')
    .map(d => d.trim())
    .filter(d => d.length > 0);

  // Add to whitelist or remove from blacklist depending on match mode
  if (currentConfig.matchMode === 'whitelist') {
    // Add to whitelist if not already there
    if (!domainListArray.includes(currentHostname)) {
      domainListArray.push(currentHostname);
      currentConfig.domainList = domainListArray;
      domainListEl.value = domainListArray.join('\n');
    }
  } else if (currentConfig.matchMode === 'blacklist') {
    // Remove from blacklist
    const index = domainListArray.indexOf(currentHostname);
    if (index > -1) {
      domainListArray.splice(index, 1);
      currentConfig.domainList = domainListArray;
      domainListEl.value = domainListArray.join('\n');
    }
  }

  await setConfig(currentConfig);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.reload(tab.id);
  }

  window.close();
}

async function handleDisableSite() {
  if (!currentHostname) return;

  const domainListArray = domainListEl.value
    .split('\n')
    .map(d => d.trim())
    .filter(d => d.length > 0);

  // Add to blacklist or remove from whitelist depending on match mode
  if (currentConfig.matchMode === 'blacklist') {
    // Add to blacklist if not already there
    if (!domainListArray.includes(currentHostname)) {
      domainListArray.push(currentHostname);
      currentConfig.domainList = domainListArray;
      domainListEl.value = domainListArray.join('\n');
    }
  } else if (currentConfig.matchMode === 'whitelist') {
    // Remove from whitelist
    const index = domainListArray.indexOf(currentHostname);
    if (index > -1) {
      domainListArray.splice(index, 1);
      currentConfig.domainList = domainListArray;
      domainListEl.value = domainListArray.join('\n');
    }
  }

  await setConfig(currentConfig);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.reload(tab.id);
  }

  window.close();
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
  saveChanges();
});
debugModeEl.addEventListener('change', () => saveChanges());
matchModeEl.addEventListener('blur', () => saveChanges());
domainListEl.addEventListener('blur', () => saveChanges());

enableSiteBtn.addEventListener('click', handleEnableSite);
disableSiteBtn.addEventListener('click', handleDisableSite);

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
