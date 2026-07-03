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
    globalStatusEl.textContent = globalEnabledEl.checked ? 'Global Protection Enabled' : 'Global Protection Disabled';
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
            alert('Latitude must be between -90 and 90');
            return;
        }
        if (lon < -180 || lon > 180) {
            alert('Longitude must be between -180 and 180');
            return;
        }
        if (acc <= 0) {
            alert('Accuracy must be greater than 0');
            return;
        }
        if (offset < -840 || offset > 720) {
            alert('Offset minutes must be between -840 and 720');
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
        alert('Failed to save configuration');
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
        alert('Failed to apply profile');
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
        alert('Invalid coordinates');
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
        alert('Coordinate saved');
    }
}
function handleOpenLeakTest() {
    chrome.tabs.create({
        url: chrome.runtime.getURL('leak-test/leak-test.html')
    });
}
async function handleReset() {
    if (confirm('Reset all settings to defaults?')) {
        await resetConfig();
        await loadConfig();
    }
}
// Event listeners
globalEnabledEl.addEventListener('change', updateGlobalStatus);
applyProfileBtn.addEventListener('click', handleApplyProfile);
enableSiteBtn.addEventListener('click', handleEnableSite);
disableSiteBtn.addEventListener('click', handleDisableSite);
saveCoordinateBtn.addEventListener('click', handleSaveCoordinate);
saveBtn.addEventListener('click', saveChanges);
openLeakTestBtn.addEventListener('click', handleOpenLeakTest);
resetBtn.addEventListener('click', handleReset);
// Initialize
loadConfig();
