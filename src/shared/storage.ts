import type { PrivacyConfig, InjectedConfig } from './types';
import { DEFAULT_CONFIG } from './defaults';
import { applyProfileToConfig } from './profile';
import { isSiteEnabled, normalizeDomain, normalizeDomainList } from './domain-matcher';

const STORAGE_KEY = 'bpg_config';

export async function getConfig(): Promise<PrivacyConfig> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      const stored = result[STORAGE_KEY];

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
        domainList: stored.domainList ?? DEFAULT_CONFIG.domainList,
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
  await chrome.storage.local.set({ [STORAGE_KEY]: config });
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

  return {
    enabled: isSiteEnabled(hostname, config),
    debugMode: config.debugMode || false,
    geolocation: config.geolocation,
    language: config.language,
    timezone: config.timezone,
    canvas: config.canvas,
    webrtc: config.webrtc
  };
}

export async function applyProfile(profileId: string): Promise<PrivacyConfig> {
  const config = await getConfig();
  const newConfig = applyProfileToConfig(config, profileId);
  await setConfig(newConfig);
  return newConfig;
}

/** 站点例外只更新当前域名；null 表示恢复跟随名单。 */
export async function setSiteEnabled(hostname: string, enabled: boolean | null): Promise<PrivacyConfig> {
  const config = await getConfig();
  if (enabled === null) delete config.siteRules[hostname];
  else config.siteRules[hostname] = { enabled };
  await setConfig(config);
  return config;
}

/** 表单只提交用户实际修改的字段，保留后台或另一页面的新值。 */
export async function saveConfigChanges(before: PrivacyConfig, after: PrivacyConfig): Promise<void> {
  const latest = await getConfig();
  // 配置组只合并到字段层；数组（域名、语言等）作为一个完整字段保存。
  for (const key of Object.keys(after) as (keyof PrivacyConfig)[]) {
    if (JSON.stringify(before[key]) === JSON.stringify(after[key])) continue;
    const value = after[key];
    if (typeof value === 'object' && !Array.isArray(value)) {
      const previous = before[key] as Record<string, unknown>;
      const target = latest[key] as Record<string, unknown>;
      for (const field of new Set([...Object.keys(previous), ...Object.keys(value)])) {
        const next = (value as Record<string, unknown>)[field];
        if (JSON.stringify(previous[field]) === JSON.stringify(next)) continue;
        if (next === undefined) delete target[field];
        else target[field] = next;
      }
    } else {
      Object.assign(latest, { [key]: value });
    }
  }
  await setConfig(latest);
}

/** 名单按钮只修改选定规则，避免把弹窗中的旧配置整体写回。 */
export async function changeDomainRule(pattern: string, remove: boolean): Promise<PrivacyConfig> {
  const config = await getConfig();
  const normalized = normalizeDomain(pattern);
  const patterns = normalizeDomainList(config.domainList);
  config.domainList = remove
    ? patterns.filter(item => item !== normalized)
    : [...new Set([...patterns, normalized])];
  await setConfig(config);
  return config;
}
