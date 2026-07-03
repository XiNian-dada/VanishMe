import './options.css';
import { getConfig, setConfig, resetConfig } from '../shared/storage';
import { DEFAULT_PROFILES } from '../shared/defaults';
import { validateProfile } from '../shared/profile';
let currentConfig;
let editingProfileId = null;
// DOM elements
const globalEnabledEl = document.getElementById('globalEnabled');
const defaultWebrtcPolicyEl = document.getElementById('defaultWebrtcPolicy');
const defaultSpoofPermissionEl = document.getElementById('defaultSpoofPermission');
const defaultProfilesEl = document.getElementById('defaultProfiles');
const customProfilesEl = document.getElementById('customProfiles');
const addProfileBtn = document.getElementById('addProfile');
const siteRulesEl = document.getElementById('siteRules');
const exportConfigBtn = document.getElementById('exportConfig');
const importConfigBtn = document.getElementById('importConfig');
const importFileEl = document.getElementById('importFile');
const resetAllBtn = document.getElementById('resetAll');
const saveBtn = document.getElementById('save');
// Modal elements
const profileModal = document.getElementById('profileModal');
const modalTitle = document.getElementById('modalTitle');
const profileIdEl = document.getElementById('profileId');
const profileNameEl = document.getElementById('profileName');
const profileDescriptionEl = document.getElementById('profileDescription');
const profileLatitudeEl = document.getElementById('profileLatitude');
const profileLongitudeEl = document.getElementById('profileLongitude');
const profileAccuracyEl = document.getElementById('profileAccuracy');
const profileLanguageEl = document.getElementById('profileLanguage');
const profileLanguagesEl = document.getElementById('profileLanguages');
const profileAcceptLanguageEl = document.getElementById('profileAcceptLanguage');
const profileTimezoneEl = document.getElementById('profileTimezone');
const profileOffsetMinutesEl = document.getElementById('profileOffsetMinutes');
const saveProfileBtn = document.getElementById('saveProfile');
const cancelProfileBtn = document.getElementById('cancelProfile');
async function loadConfig() {
    currentConfig = await getConfig();
    globalEnabledEl.checked = currentConfig.globalEnabled;
    defaultWebrtcPolicyEl.value = currentConfig.webrtc.policy;
    defaultSpoofPermissionEl.checked = currentConfig.geolocation.spoofPermission;
    renderProfiles();
    renderSiteRules();
}
function renderProfiles() {
    // Default profiles
    defaultProfilesEl.innerHTML = '';
    DEFAULT_PROFILES.forEach(profile => {
        const card = createProfileCard(profile, false);
        defaultProfilesEl.appendChild(card);
    });
    // Custom profiles
    customProfilesEl.innerHTML = '';
    if (currentConfig.profile.profiles.length === 0) {
        customProfilesEl.innerHTML = '<p style="color: #888; font-size: 14px;">No custom profiles yet</p>';
    }
    else {
        currentConfig.profile.profiles.forEach(profile => {
            const card = createProfileCard(profile, true);
            customProfilesEl.appendChild(card);
        });
    }
}
function createProfileCard(profile, isCustom) {
    const card = document.createElement('div');
    card.className = 'profile-card';
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
    const actions = document.createElement('div');
    actions.className = 'profile-actions';
    if (isCustom) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-secondary btn-sm';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => openEditProfileModal(profile);
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-danger btn-sm';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteProfile(profile.id);
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
    }
    card.appendChild(info);
    card.appendChild(actions);
    return card;
}
function renderSiteRules() {
    siteRulesEl.innerHTML = '';
    const hostnames = Object.keys(currentConfig.siteRules);
    if (hostnames.length === 0) {
        siteRulesEl.innerHTML = '<p style="color: #888; font-size: 14px;">No site-specific rules</p>';
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
        statusEl.textContent = rule.enabled ? 'Enabled' : 'Disabled';
        info.appendChild(hostnameEl);
        info.appendChild(statusEl);
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-danger btn-sm';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteSiteRule(hostname);
        ruleEl.appendChild(info);
        ruleEl.appendChild(deleteBtn);
        siteRulesEl.appendChild(ruleEl);
    });
}
function openAddProfileModal() {
    editingProfileId = null;
    modalTitle.textContent = 'Add Custom Profile';
    profileIdEl.value = '';
    profileNameEl.value = '';
    profileDescriptionEl.value = '';
    profileLatitudeEl.value = '';
    profileLongitudeEl.value = '';
    profileAccuracyEl.value = '50';
    profileLanguageEl.value = '';
    profileLanguagesEl.value = '';
    profileAcceptLanguageEl.value = '';
    profileTimezoneEl.value = '';
    profileOffsetMinutesEl.value = '';
    profileIdEl.disabled = false;
    profileModal.classList.add('active');
}
function openEditProfileModal(profile) {
    editingProfileId = profile.id;
    modalTitle.textContent = 'Edit Custom Profile';
    profileIdEl.value = profile.id;
    profileNameEl.value = profile.name;
    profileDescriptionEl.value = profile.description || '';
    profileLatitudeEl.value = profile.geolocation.latitude.toString();
    profileLongitudeEl.value = profile.geolocation.longitude.toString();
    profileAccuracyEl.value = profile.geolocation.accuracy.toString();
    profileLanguageEl.value = profile.language.language;
    profileLanguagesEl.value = profile.language.languages.join(', ');
    profileAcceptLanguageEl.value = profile.language.acceptLanguage;
    profileTimezoneEl.value = profile.timezone.timezone;
    profileOffsetMinutesEl.value = profile.timezone.offsetMinutes.toString();
    profileIdEl.disabled = true;
    profileModal.classList.add('active');
}
function closeProfileModal() {
    profileModal.classList.remove('active');
    editingProfileId = null;
}
function saveProfile() {
    const profile = {
        id: profileIdEl.value.trim(),
        name: profileNameEl.value.trim(),
        description: profileDescriptionEl.value.trim() || undefined,
        geolocation: {
            latitude: parseFloat(profileLatitudeEl.value),
            longitude: parseFloat(profileLongitudeEl.value),
            accuracy: parseFloat(profileAccuracyEl.value)
        },
        language: {
            language: profileLanguageEl.value.trim(),
            languages: profileLanguagesEl.value.split(',').map(l => l.trim()).filter(l => l),
            acceptLanguage: profileAcceptLanguageEl.value.trim()
        },
        timezone: {
            timezone: profileTimezoneEl.value.trim(),
            offsetMinutes: parseInt(profileOffsetMinutesEl.value)
        }
    };
    if (!validateProfile(profile)) {
        alert('Invalid profile data. Please check all fields.');
        return;
    }
    if (editingProfileId) {
        // Edit existing
        const index = currentConfig.profile.profiles.findIndex(p => p.id === editingProfileId);
        if (index !== -1) {
            currentConfig.profile.profiles[index] = profile;
        }
    }
    else {
        // Add new
        const exists = currentConfig.profile.profiles.some(p => p.id === profile.id);
        if (exists) {
            alert('Profile ID already exists');
            return;
        }
        currentConfig.profile.profiles.push(profile);
    }
    renderProfiles();
    closeProfileModal();
}
function deleteProfile(profileId) {
    if (!confirm('Delete this profile?'))
        return;
    currentConfig.profile.profiles = currentConfig.profile.profiles.filter(p => p.id !== profileId);
    renderProfiles();
}
function deleteSiteRule(hostname) {
    if (!confirm(`Delete rule for ${hostname}?`))
        return;
    delete currentConfig.siteRules[hostname];
    renderSiteRules();
}
async function saveSettings() {
    currentConfig.globalEnabled = globalEnabledEl.checked;
    currentConfig.webrtc.policy = defaultWebrtcPolicyEl.value;
    currentConfig.geolocation.spoofPermission = defaultSpoofPermissionEl.checked;
    await setConfig(currentConfig);
    alert('Settings saved');
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
        // Basic validation
        if (!imported.geolocation || !imported.webrtc || !imported.language || !imported.timezone) {
            throw new Error('Invalid configuration file');
        }
        if (confirm('Import this configuration? This will replace your current settings.')) {
            await setConfig(imported);
            await loadConfig();
            alert('Configuration imported successfully');
        }
    }
    catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import configuration. Please check the file format.');
    }
    importFileEl.value = '';
}
async function resetAllData() {
    if (confirm('Reset all data to defaults? This cannot be undone.')) {
        if (confirm('Are you absolutely sure?')) {
            await resetConfig();
            await loadConfig();
            alert('All data has been reset');
        }
    }
}
// Event listeners
addProfileBtn.addEventListener('click', openAddProfileModal);
saveProfileBtn.addEventListener('click', saveProfile);
cancelProfileBtn.addEventListener('click', closeProfileModal);
exportConfigBtn.addEventListener('click', exportConfiguration);
importConfigBtn.addEventListener('click', importConfiguration);
importFileEl.addEventListener('change', handleImportFile);
resetAllBtn.addEventListener('click', resetAllData);
saveBtn.addEventListener('click', saveSettings);
// Close modal on outside click
profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) {
        closeProfileModal();
    }
});
// Initialize
loadConfig();
