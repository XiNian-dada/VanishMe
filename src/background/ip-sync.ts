import { getConfig } from '../shared/storage';
import type { PrivacyConfig } from '../shared/types';

const ALARM_NAME = 'vanishme-check-exit-ip';
const LAST_IP_KEY = 'vanishme_last_synced_ip';
const IP_API = 'https://ipwhois.app/json/';

// 与手动「从 IP 自动配置」使用相同的国家/语言对应关系。
const COUNTRY_LANGUAGES: Record<string, string> = {
  US: 'en-US', GB: 'en-GB', CN: 'zh-CN', JP: 'ja-JP', KR: 'ko-KR',
  DE: 'de-DE', FR: 'fr-FR', SG: 'en-SG', TW: 'zh-TW', HK: 'zh-HK'
};

let activeCheck: AbortController | null = null;
let alarmUpdate = Promise.resolve();

function isSyncEnabled(config?: Partial<PrivacyConfig>): boolean {
  return config?.globalEnabled === true && config.autoIPSync === true;
}

async function fetchJson(url: string, controller: AbortController) {
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`IP lookup failed: ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkExitIP(): Promise<void> {
  // 启动、安装和 alarm 可能同时触发，避免重复请求与配置写入。
  if (activeCheck) return;
  const controller = new AbortController();
  activeCheck = controller;
  try {
    if (!isSyncEnabled(await getConfig()) || controller.signal.aborted) return;
    const { ip } = await fetchJson(`${IP_API}?objects=ip`, controller);
    if (typeof ip !== 'string' || !ip.trim()) {
      throw new Error('IP lookup returned no IP');
    }

    const stored = await chrome.storage.local.get(LAST_IP_KEY);
    if (stored[LAST_IP_KEY] === ip || controller.signal.aborted) return;

    // 仅 IP 变化（含首次检测）时查询地区，并指定该 IP，避免两次请求出口不一致。
    const data = await fetchJson(`${IP_API}${encodeURIComponent(ip)}`, controller);
    if (data.success !== true || data.ip !== ip ||
        typeof data.latitude !== 'number' || !Number.isFinite(data.latitude) ||
        data.latitude < -90 || data.latitude > 90 ||
        typeof data.longitude !== 'number' || !Number.isFinite(data.longitude) ||
        data.longitude < -180 || data.longitude > 180 ||
        typeof data.timezone !== 'string' || !data.timezone ||
        typeof data.timezone_gmtOffset !== 'number' || !Number.isFinite(data.timezone_gmtOffset) ||
        typeof data.country_code !== 'string' || !data.country_code) {
      throw new Error('IP lookup returned invalid location data');
    }
    // 验证 IANA 时区，防止无效响应覆盖可用配置。
    new Intl.DateTimeFormat('en', { timeZone: data.timezone });

    // 网络请求完成后再读取最新配置，保留其他设置及各模块的启用状态。
    const config = await getConfig();
    if (!isSyncEnabled(config) || controller.signal.aborted) return;
    const language = COUNTRY_LANGUAGES[data.country_code] || 'en-US';
    const baseLanguage = language.split('-')[0];
    const updated = {
      ...config,
      geolocation: {
        ...config.geolocation,
        latitude: data.latitude,
        longitude: data.longitude
      },
      timezone: {
        ...config.timezone,
        timezone: data.timezone,
        offsetMinutes: -data.timezone_gmtOffset / 60
      },
      language: {
        ...config.language,
        language,
        languages: [language, baseLanguage],
        acceptLanguage: `${language},${baseLanguage};q=0.9`
      },
      profile: { ...config.profile, activeProfileId: null }
    };

    // 配置和已同步 IP 一起写入；失败时不推进 IP，下一轮仍会重试。
    await chrome.storage.local.set({
      bpg_config: updated,
      [LAST_IP_KEY]: ip
    });
  } catch (error) {
    if (!controller.signal.aborted) {
      console.warn('Automatic IP sync failed; keeping existing config:', error);
    }
  } finally {
    if (activeCheck === controller) activeCheck = null;
  }
}

export function ensureIPCheckAlarm(): Promise<void> {
  // 串行更新，防止快速切换开关时旧的创建操作晚于清除操作完成。
  alarmUpdate = alarmUpdate.catch(() => {}).then(async () => {
    if (!isSyncEnabled(await getConfig())) {
      await chrome.alarms.clear(ALARM_NAME);
      return;
    }
    const alarm = await chrome.alarms.get(ALARM_NAME);
    if (!alarm || alarm.periodInMinutes !== 5) {
      await chrome.alarms.create(ALARM_NAME, { periodInMinutes: 5 });
    }
  });
  return alarmUpdate;
}

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) void checkExitIP();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  const change = changes.bpg_config;
  if (areaName !== 'local' || !change) return;
  const enabled = isSyncEnabled(change.newValue);
  if (enabled === isSyncEnabled(change.oldValue)) return;

  // 立即作废进行中的请求，即使用户随后重新开启，也不接受旧响应。
  activeCheck?.abort();
  activeCheck = null;
  void (async () => {
    // 每次重新开启都同步一次；失败时定时任务仍可重试同一个 IP。
    if (enabled) await chrome.storage.local.remove(LAST_IP_KEY);
    await ensureIPCheckAlarm();
    if (enabled) await checkExitIP();
  })().catch(error => console.error('Failed to update automatic IP sync:', error));
});
