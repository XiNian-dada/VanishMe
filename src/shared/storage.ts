import type { PrivacyConfig, InjectedConfig } from './types';
import { DEFAULT_CONFIG } from './defaults';
import { applyProfileToConfig } from './profile';

const STORAGE_KEY = 'bpg_config';

export async function getConfig(): Promise<PrivacyConfig> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      return { ...DEFAULT_CONFIG, ...result[STORAGE_KEY] };
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Failed to get config:', error);
    return DEFAULT_CONFIG;
  }
}

export async function setConfig(config: PrivacyConfig): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: config });
  } catch (error) {
    console.error('Failed to set config:', error);
  }
}

export async function updateConfig(updates: Partial<PrivacyConfig>): Promise<PrivacyConfig> {
  const config = await getConfig();
  const newConfig = { ...config, ...updates };
  await setConfig(newConfig);
  return newConfig;
}

export async function resetConfig(): Promise<void> {
  await setConfig(DEFAULT_CONFIG);
}

export async function getEffectiveConfigForUrl(url: string): Promise<InjectedConfig> {
  const config = await getConfig();

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = '';
  }

  const siteRule = config.siteRules[hostname];
  const siteEnabled = siteRule ? siteRule.enabled : true;

  const enabled = config.globalEnabled && siteEnabled;

  return {
    enabled,
    geolocation: config.geolocation,
    language: config.language,
    timezone: config.timezone
  };
}

export async function applyProfile(profileId: string): Promise<PrivacyConfig> {
  const config = await getConfig();
  const newConfig = applyProfileToConfig(config, profileId);
  await setConfig(newConfig);
  return newConfig;
}
