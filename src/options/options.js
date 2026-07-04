import './options.css';
import { getConfig, setConfig, resetConfig, applyProfile } from '../shared/storage';
import { DEFAULT_PROFILES } from '../shared/defaults';
let currentConfig;
// DOM elements
const globalEnabledEl = document.getElementById('globalEnabled');
const debugModeEl = document.getElementById('debugMode');
const matchModeEl = document.getElementById('matchMode');
const domainListEl = document.getElementById('domainList');
// Current config elements
const geolocationEnabledEl = document.getElementById('geolocationEnabled');
const latitudeEl = document.getElementById('latitude');
const longitudeEl = document.getElementById('longitude');
const accuracyEl = document.getElementById('accuracy');
const randomizeEl = document.getElementById('randomize');
const randomRadiusMetersEl = document.getElementById('randomRadiusMeters');
const spoofPermissionEl = document.getElementById('spoofPermission');
const getFromIPBtn = document.getElementById('getFromIP');
const timezoneEnabledEl = document.getElementById('timezoneEnabled');
const timezoneEl = document.getElementById('timezone');
const utcOffsetEl = document.getElementById('utcOffset');
const languageEnabledEl = document.getElementById('languageEnabled');
const languageEl = document.getElementById('language');
const languagesEl = document.getElementById('languages');
const acceptLanguageEl = document.getElementById('acceptLanguage');
const webrtcEnabledEl = document.getElementById('webrtcEnabled');
const webrtcPolicyEl = document.getElementById('webrtcPolicy');
const defaultProfilesEl = document.getElementById('defaultProfiles');
const customProfilesEl = document.getElementById('customProfiles');
const siteRulesEl = document.getElementById('siteRules');
const exportConfigBtn = document.getElementById('exportConfig');
const importConfigBtn = document.getElementById('importConfig');
const importFileEl = document.getElementById('importFile');
const resetAllBtn = document.getElementById('resetAll');
const saveBtn = document.getElementById('save');
const saveAsCustomBtn = document.getElementById('saveAsCustom');
// Modal elements
const saveProfileModal = document.getElementById('saveProfileModal');
const newProfileNameEl = document.getElementById('newProfileName');
const newProfileDescriptionEl = document.getElementById('newProfileDescription');
const confirmSaveProfileBtn = document.getElementById('confirmSaveProfile');
const cancelSaveProfileBtn = document.getElementById('cancelSaveProfile');
async function loadConfig() {
    currentConfig = await getConfig();
    // Global settings
    globalEnabledEl.checked = currentConfig.globalEnabled;
    debugModeEl.checked = currentConfig.debugMode || false;
    // Match mode
    matchModeEl.value = currentConfig.matchMode || 'global';
    domainListEl.value = (currentConfig.domainList || []).join('\n');
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
    renderProfiles();
    renderSiteRules();
}
function renderProfiles() {
    // Default profiles (presets)
    defaultProfilesEl.innerHTML = '';
    DEFAULT_PROFILES.forEach(profile => {
        const card = createPresetProfileCard(profile);
        defaultProfilesEl.appendChild(card);
    });
    // Custom profiles
    customProfilesEl.innerHTML = '';
    const customProfiles = currentConfig.profile.profiles.filter(p => !DEFAULT_PROFILES.some(dp => dp.id === p.id));
    if (customProfiles.length === 0) {
        customProfilesEl.innerHTML = '<p style="color: #888; font-size: 14px;">暂无自定义配置文件</p>';
    }
    else {
        customProfiles.forEach(profile => {
            const card = createCustomProfileCard(profile);
            customProfilesEl.appendChild(card);
        });
    }
}
function createPresetProfileCard(profile) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    const header = document.createElement('div');
    header.className = 'profile-header';
    const info = document.createElement('div');
    info.className = 'profile-info';
    const name = document.createElement('div');
    name.className = 'profile-name';
    name.textContent = profile.name;
    const desc = document.createElement('div');
    desc.className = 'profile-desc';
    desc.textContent = `${profile.geolocation.latitude}, ${profile.geolocation.longitude} | ${profile.timezone.timezone}`;
    info.appendChild(name);
    info.appendChild(desc);
    header.appendChild(info);
    const actions = document.createElement('div');
    actions.className = 'profile-actions';
    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn-primary btn-sm';
    applyBtn.textContent = '应用';
    applyBtn.onclick = () => handleApplyProfile(profile.id);
    actions.appendChild(applyBtn);
    card.appendChild(header);
    card.appendChild(actions);
    return card;
}
function createCustomProfileCard(profile) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    const header = document.createElement('div');
    header.className = 'profile-header';
    const info = document.createElement('div');
    info.className = 'profile-info';
    const name = document.createElement('div');
    name.className = 'profile-name';
    name.textContent = profile.name;
    const desc = document.createElement('div');
    desc.className = 'profile-desc';
    desc.textContent = profile.description || `${profile.geolocation.latitude}, ${profile.geolocation.longitude} | ${profile.timezone.timezone}`;
    info.appendChild(name);
    info.appendChild(desc);
    header.appendChild(info);
    const actions = document.createElement('div');
    actions.className = 'profile-actions';
    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn-primary btn-sm';
    applyBtn.textContent = '应用';
    applyBtn.onclick = () => handleApplyProfile(profile.id);
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn-secondary btn-sm';
    exportBtn.textContent = '导出';
    exportBtn.onclick = () => exportProfile(profile);
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger btn-sm';
    deleteBtn.textContent = '删除';
    deleteBtn.onclick = () => deleteProfile(profile.id);
    actions.appendChild(applyBtn);
    actions.appendChild(exportBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(header);
    card.appendChild(actions);
    return card;
}
function renderSiteRules() {
    siteRulesEl.innerHTML = '';
    const hostnames = Object.keys(currentConfig.siteRules);
    if (hostnames.length === 0) {
        siteRulesEl.innerHTML = '<p style="color: #888; font-size: 14px;">暂无站点特定规则</p>';
        return;
    }
    hostnames.forEach(hostname => {
        const rule = currentConfig.siteRules[hostname];
        const ruleEl = document.createElement('div');
        ruleEl.className = 'site-rule';
        const info = document.createElement('div');
        const hostnameEl = document.createElement('span');
        hostnameEl.className = 'site-hostname';
        hostnameEl.textContent = hostname;
        const statusEl = document.createElement('span');
        statusEl.className = `site-status ${rule.enabled ? 'enabled' : 'disabled'}`;
        statusEl.textContent = rule.enabled ? '已启用' : '已禁用';
        info.appendChild(hostnameEl);
        info.appendChild(statusEl);
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-danger btn-sm';
        deleteBtn.textContent = '删除';
        deleteBtn.onclick = () => deleteSiteRule(hostname);
        ruleEl.appendChild(info);
        ruleEl.appendChild(deleteBtn);
        siteRulesEl.appendChild(ruleEl);
    });
}
async function handleApplyProfile(profileId) {
    try {
        await applyProfile(profileId);
        await loadConfig();
        alert('配置已应用');
    }
    catch (error) {
        console.error('Failed to apply profile:', error);
        alert('应用配置失败');
    }
}
function openSaveAsCustomModal() {
    newProfileNameEl.value = '';
    newProfileDescriptionEl.value = '';
    saveProfileModal.classList.add('active');
}
function closeSaveAsCustomModal() {
    saveProfileModal.classList.remove('active');
}
function handleSaveAsCustom() {
    const name = newProfileNameEl.value.trim();
    if (!name) {
        alert('请输入配置名称');
        return;
    }
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const description = newProfileDescriptionEl.value.trim();
    // Check if ID already exists
    const exists = currentConfig.profile.profiles.some(p => p.id === id);
    if (exists) {
        alert('配置名称已存在，请使用其他名称');
        return;
    }
    // Create new profile from current config
    const newProfile = {
        id,
        name,
        description: description || undefined,
        geolocation: {
            latitude: currentConfig.geolocation.latitude,
            longitude: currentConfig.geolocation.longitude,
            accuracy: currentConfig.geolocation.accuracy
        },
        language: {
            language: currentConfig.language.language,
            languages: [...currentConfig.language.languages],
            acceptLanguage: currentConfig.language.acceptLanguage
        },
        timezone: {
            timezone: currentConfig.timezone.timezone,
            offsetMinutes: currentConfig.timezone.offsetMinutes
        }
    };
    currentConfig.profile.profiles.push(newProfile);
    setConfig(currentConfig);
    renderProfiles();
    closeSaveAsCustomModal();
    alert('自定义配置已保存');
}
function exportProfile(profile) {
    const dataStr = JSON.stringify(profile, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vanishme-profile-${profile.id}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
}
function deleteProfile(profileId) {
    if (!confirm('确定要删除这个配置文件吗？'))
        return;
    currentConfig.profile.profiles = currentConfig.profile.profiles.filter(p => p.id !== profileId);
    setConfig(currentConfig);
    renderProfiles();
}
function deleteSiteRule(hostname) {
    if (!confirm(`确定要删除 ${hostname} 的规则吗？`))
        return;
    delete currentConfig.siteRules[hostname];
    renderSiteRules();
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
            const languageMap = {
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
        // 4. Auto-save
        await saveSettings();
        alert(`已从 IP 获取并保存配置：\n${data.city}, ${data.country}\n纬度: ${data.latitude}\n经度: ${data.longitude}\n时区: ${data.timezone || 'N/A'}`);
    }
    catch (error) {
        console.error('Failed to get config from IP:', error);
        alert('从 IP 获取配置失败，请手动输入或稍后重试');
    }
    finally {
        getFromIPBtn.disabled = false;
        getFromIPBtn.textContent = '🌐 从 IP 自动配置（地理位置 + 时区 + 语言）';
    }
}
async function saveSettings() {
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
        const offsetMinutes = -utcOffsetHours * 60;
        currentConfig.globalEnabled = globalEnabledEl.checked;
        currentConfig.debugMode = debugModeEl.checked;
        currentConfig.matchMode = matchModeEl.value;
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
        currentConfig.webrtc.policy = webrtcPolicyEl.value;
        await setConfig(currentConfig);
        alert('设置已保存');
    }
    catch (error) {
        console.error('Failed to save config:', error);
        alert('保存配置失败');
    }
}
function exportConfiguration() {
    const dataStr = JSON.stringify(currentConfig, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vanishme-config-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
}
function importConfiguration() {
    importFileEl.click();
}
async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file)
        return;
    try {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (!imported.geolocation || !imported.webrtc || !imported.language || !imported.timezone) {
            throw new Error('Invalid configuration file');
        }
        if (confirm('导入此配置？这将替换你的当前设置。')) {
            await setConfig(imported);
            await loadConfig();
            alert('配置导入成功');
        }
    }
    catch (error) {
        console.error('Import failed:', error);
        alert('导入配置失败，请检查文件格式');
    }
    importFileEl.value = '';
}
async function resetAllData() {
    if (confirm('重置所有数据为默认值？此操作无法撤销。')) {
        if (confirm('确定要继续吗？')) {
            await resetConfig();
            await loadConfig();
            alert('所有数据已重置');
        }
    }
}
// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.querySelector(`.tab-content[data-tab="${targetTab}"]`)?.classList.add('active');
    });
});
// Event listeners
saveBtn.addEventListener('click', saveSettings);
saveAsCustomBtn.addEventListener('click', openSaveAsCustomModal);
confirmSaveProfileBtn.addEventListener('click', handleSaveAsCustom);
cancelSaveProfileBtn.addEventListener('click', closeSaveAsCustomModal);
getFromIPBtn.addEventListener('click', handleGetFromIP);
exportConfigBtn.addEventListener('click', exportConfiguration);
importConfigBtn.addEventListener('click', importConfiguration);
importFileEl.addEventListener('change', handleImportFile);
resetAllBtn.addEventListener('click', resetAllData);
// Close modal on outside click
saveProfileModal.addEventListener('click', (e) => {
    if (e.target === saveProfileModal) {
        closeSaveAsCustomModal();
    }
});
// Initialize
loadConfig();
