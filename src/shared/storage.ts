import type { PrivacyConfig, InjectedConfig } from './types';
import { DEFAULT_CONFIG } from './defaults';
import { applyProfileToConfig } from './profile';
import { shouldEnableSpoofing } from './domain-matcher';

const STORAGE_KEY = 'bpg_config';

export async function getConfig(): Promise<PrivacyConfig> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      const stored = result[STORAGE_KEY];

      // 合并测试网站域名，确保检测站开箱即用
      const testDomains = DEFAULT_CONFIG.domainList.filter(d => 
        d.includes('iprisk') || d.includes('browserscan') || d.includes('browserleaks') || d.includes('ipleak') || d.includes('deviceinfo')
      );
      const mergedDomainList = Array.from(new Set([
        ...(stored.domainList || DEFAULT_CONFIG.domainList),
        ...testDomains
      ]));

      // 补充可能新增的内置预设（如 us-west）
      const existingProfileIds = new Set((stored.profile?.profiles || []).map((p: any) => p.id));
      const mergedProfiles = [
        ...(stored.profile?.profiles || []),
        ...DEFAULT_CONFIG.profile.profiles.filter(p => !existingProfileIds.has(p.id))
      ];

      // 深度合并，确保所有新字段都有默认值
      return {
        ...DEFAULT_CONFIG,
        ...stored,
        domainList: mergedDomainList,
        geolocation: {
          ...DEFAULT_CONFIG.geolocation,
          ...(stored.geolocation || {})
        },
        webrtc: {
          ...DEFAULT_CONFIG.webrtc,
          ...(stored.webrtc || {})
        },
        language: {
          ...DEFAULT_CONFIG.language,
          ...(stored.language || {})
        },
        timezone: {
          ...DEFAULT_CONFIG.timezone,
          ...(stored.timezone || {})
        },
        canvas: {
          ...DEFAULT_CONFIG.canvas,
          ...(stored.canvas || {})
        },
        profile: {
          ...DEFAULT_CONFIG.profile,
          ...(stored.profile || {}),
          profiles: mergedProfiles
        }
      };
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

  // 检查全局开关
  if (!config.globalEnabled) {
    return {
      enabled: false,
      debugMode: config.debugMode || false,
      geolocation: config.geolocation,
      language: config.language,
      timezone: config.timezone,
      canvas: config.canvas
    };
  }

  // 根据匹配模式和域名列表判断是否启用
  const matchEnabled = shouldEnableSpoofing(
    hostname,
    config.matchMode,
    config.domainList
  );

  // 检查站点特定规则（优先级最高）
  const siteRule = config.siteRules[hostname];
  const enabled = siteRule ? siteRule.enabled : matchEnabled;

  return {
    enabled,
    debugMode: config.debugMode || false,
    geolocation: config.geolocation,
    language: config.language,
    timezone: config.timezone,
    canvas: config.canvas
  };
}

export async function applyProfile(profileId: string): Promise<PrivacyConfig> {
  const config = await getConfig();
  const newConfig = applyProfileToConfig(config, profileId);
  await setConfig(newConfig);
  return newConfig;
}
