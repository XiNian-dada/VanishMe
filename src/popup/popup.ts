import './popup.css';
import { getConfig, setConfig, resetConfig, applyProfile } from '../shared/storage';
import type { PrivacyConfig, GeolocationHistory } from '../shared/types';

// DOM elements
const globalEnabledEl = document.getElementById('globalEnabled') as HTMLInputElement;
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

const saveBtn = document.getElementById('save') as HTMLButtonElement;
const openOptionsBtn = document.getElementById('openOptions') as HTMLButtonElement;
const openLeakTestBtn = document.getElementById('openLeakTest') as HTMLButtonElement;
const resetBtn = document.getElementById('reset') as HTMLButtonElement;

let currentConfig: PrivacyConfig;
let currentHostname: string = '';

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

    // Reload current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.reload(tab.id);
    }

    window.close();
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
    alert('坐标已保存');
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

    if (data.latitude && data.longitude) {
      latitudeEl.value = data.latitude.toString();
      longitudeEl.value = data.longitude.toString();

      // Set timezone if available
      if (data.timezone) {
        timezoneEl.value = data.timezone;

        // Calculate offset from timezone name and convert to UTC offset hours
        // getTimezoneOffset returns UTC - local time in minutes
        const now = new Date();
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: data.timezone }));
        const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
        const offsetMinutes = Math.round((utcDate.getTime() - tzDate.getTime()) / 60000);

        // Convert to UTC offset hours (reverse sign)
        // offsetMinutes = 420 (LA) -> UTC offset = -7
        // offsetMinutes = -480 (SG) -> UTC offset = +8
        const utcOffsetHours = -offsetMinutes / 60;
        utcOffsetEl.value = utcOffsetHours.toString();
      }

      alert(`已从 IP 获取位置信息：\n${data.city}, ${data.country}\n纬度: ${data.latitude}\n经度: ${data.longitude}\n时区: ${data.timezone || 'N/A'}`);
    } else {
      throw new Error('No location data in response');
    }
  } catch (error) {
    console.error('Failed to get location from IP:', error);
    alert('从 IP 获取位置失败，请手动输入或稍后重试');
  } finally {
    getFromIPBtn.disabled = false;
    getFromIPBtn.textContent = '从 IP 获取位置';
  }
}

// Event listeners
globalEnabledEl.addEventListener('change', updateGlobalStatus);
enableSiteBtn.addEventListener('click', handleEnableSite);
disableSiteBtn.addEventListener('click', handleDisableSite);
saveCoordinateBtn.addEventListener('click', handleSaveCoordinate);
getFromIPBtn.addEventListener('click', handleGetFromIP);
saveBtn.addEventListener('click', saveChanges);
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
