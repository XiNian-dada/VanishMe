import './popup.css';
import { getConfig, setConfig, resetConfig, applyProfile } from '../shared/storage';
// DOM elements
const globalEnabledEl = document.getElementById('globalEnabled');
const globalStatusEl = document.getElementById('globalStatus');
const currentSiteEl = document.getElementById('currentSite');
const enableSiteBtn = document.getElementById('enableSite');
const disableSiteBtn = document.getElementById('disableSite');
const profileSelectEl = document.getElementById('profileSelect');
const applyProfileBtn = document.getElementById('applyProfile');
const geolocationEnabledEl = document.getElementById('geolocationEnabled');
const latitudeEl = document.getElementById('latitude');
const longitudeEl = document.getElementById('longitude');
const accuracyEl = document.getElementById('accuracy');
const randomizeEl = document.getElementById('randomize');
const randomRadiusMetersEl = document.getElementById('randomRadiusMeters');
const spoofPermissionEl = document.getElementById('spoofPermission');
const saveCoordinateBtn = document.getElementById('saveCoordinate');
const getFromIPBtn = document.getElementById('getFromIP');
const timezoneEnabledEl = document.getElementById('timezoneEnabled');
const timezoneEl = document.getElementById('timezone');
const offsetMinutesEl = document.getElementById('offsetMinutes');
const languageEnabledEl = document.getElementById('languageEnabled');
const languageEl = document.getElementById('language');
const languagesEl = document.getElementById('languages');
const acceptLanguageEl = document.getElementById('acceptLanguage');
const webrtcEnabledEl = document.getElementById('webrtcEnabled');
const webrtcPolicyEl = document.getElementById('webrtcPolicy');
const saveBtn = document.getElementById('save');
const openLeakTestBtn = document.getElementById('openLeakTest');
const resetBtn = document.getElementById('reset');
let currentConfig;
let currentHostname = '';
async function loadConfig() {
    currentConfig = await getConfig();
    // Get current tab hostname
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url) {
            currentHostname = new URL(tab.url).hostname;
            currentSiteEl.textContent = currentHostname;
        }
    }
    catch (error) {
        currentSiteEl.textContent = 'N/A';
    }
    // Populate UI
    globalEnabledEl.checked = currentConfig.globalEnabled;
    updateGlobalStatus();
    // Profile
    profileSelectEl.value = currentConfig.profile.activeProfileId || '';
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
    offsetMinutesEl.value = currentConfig.timezone.offsetMinutes.toString();
    // Language
    languageEnabledEl.checked = currentConfig.language.enabled;
    languageEl.value = currentConfig.language.language;
    languagesEl.value = currentConfig.language.languages.join(', ');
    acceptLanguageEl.value = currentConfig.language.acceptLanguage;
    // WebRTC
    webrtcEnabledEl.checked = currentConfig.webrtc.enabled;
    webrtcPolicyEl.value = currentConfig.webrtc.policy;
}
function updateGlobalStatus() {
    globalStatusEl.textContent = globalEnabledEl.checked ? '全局保护已启用' : '全局保护已禁用';
}
async function saveChanges() {
    try {
        // Parse languages
        const languagesArray = languagesEl.value
            .split(',')
            .map(l => l.trim())
            .filter(l => l.length > 0);
        // Validate inputs
        const lat = parseFloat(latitudeEl.value);
        const lon = parseFloat(longitudeEl.value);
        const acc = parseFloat(accuracyEl.value);
        const offset = parseInt(offsetMinutesEl.value);
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
        if (offset < -840 || offset > 720) {
            alert('时差必须在 -840 到 720 分钟之间');
            return;
        }
        currentConfig.globalEnabled = globalEnabledEl.checked;
        currentConfig.geolocation.enabled = geolocationEnabledEl.checked;
        currentConfig.geolocation.latitude = lat;
        currentConfig.geolocation.longitude = lon;
        currentConfig.geolocation.accuracy = acc;
        currentConfig.geolocation.randomize = randomizeEl.checked;
        currentConfig.geolocation.randomRadiusMeters = parseFloat(randomRadiusMetersEl.value);
        currentConfig.geolocation.spoofPermission = spoofPermissionEl.checked;
        currentConfig.timezone.enabled = timezoneEnabledEl.checked;
        currentConfig.timezone.timezone = timezoneEl.value;
        currentConfig.timezone.offsetMinutes = offset;
        currentConfig.language.enabled = languageEnabledEl.checked;
        currentConfig.language.language = languageEl.value;
        currentConfig.language.languages = languagesArray;
        currentConfig.language.acceptLanguage = acceptLanguageEl.value;
        currentConfig.webrtc.enabled = webrtcEnabledEl.checked;
        currentConfig.webrtc.policy = webrtcPolicyEl.value;
        await setConfig(currentConfig);
        // Reload current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            chrome.tabs.reload(tab.id);
        }
        window.close();
    }
    catch (error) {
        console.error('Failed to save config:', error);
        alert('保存配置失败');
    }
}
async function handleApplyProfile() {
    const profileId = profileSelectEl.value;
    if (!profileId)
        return;
    try {
        await applyProfile(profileId);
        await loadConfig();
    }
    catch (error) {
        console.error('Failed to apply profile:', error);
        alert('应用配置失败');
    }
}
async function handleEnableSite() {
    if (!currentHostname)
        return;
    currentConfig.siteRules[currentHostname] = { enabled: true };
    await setConfig(currentConfig);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
        chrome.tabs.reload(tab.id);
    }
    window.close();
}
async function handleDisableSite() {
    if (!currentHostname)
        return;
    currentConfig.siteRules[currentHostname] = { enabled: false };
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
    const history = {
        latitude: lat,
        longitude: lon,
        accuracy: acc,
        createdAt: Date.now()
    };
    // Keep only last 10 unique coordinates
    const existingHistory = currentConfig.geolocation.history || [];
    const isDuplicate = existingHistory.some(h => h.latitude === lat && h.longitude === lon);
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
                // Calculate offset from timezone name
                // This is approximate - user should verify
                const now = new Date();
                const tzDate = new Date(now.toLocaleString('en-US', { timeZone: data.timezone }));
                const localDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
                const offsetMinutes = Math.round((localDate.getTime() - tzDate.getTime()) / 60000);
                offsetMinutesEl.value = offsetMinutes.toString();
            }
            alert(`已从 IP 获取位置信息：\n${data.city}, ${data.country}\n纬度: ${data.latitude}\n经度: ${data.longitude}\n时区: ${data.timezone || 'N/A'}`);
        }
        else {
            throw new Error('No location data in response');
        }
    }
    catch (error) {
        console.error('Failed to get location from IP:', error);
        alert('从 IP 获取位置失败，请手动输入或稍后重试');
    }
    finally {
        getFromIPBtn.disabled = false;
        getFromIPBtn.textContent = '从 IP 获取位置';
    }
}
// Event listeners
globalEnabledEl.addEventListener('change', updateGlobalStatus);
applyProfileBtn.addEventListener('click', handleApplyProfile);
enableSiteBtn.addEventListener('click', handleEnableSite);
disableSiteBtn.addEventListener('click', handleDisableSite);
saveCoordinateBtn.addEventListener('click', handleSaveCoordinate);
getFromIPBtn.addEventListener('click', handleGetFromIP);
saveBtn.addEventListener('click', saveChanges);
openLeakTestBtn.addEventListener('click', handleOpenLeakTest);
resetBtn.addEventListener('click', handleReset);
// Initialize
loadConfig();
