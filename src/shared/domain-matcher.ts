import type { PrivacyConfig } from './types';

/** 接受域名或 URL，统一大小写、国际化域名、端口及路径。 */
export function normalizeDomain(pattern: string): string {
  const value = pattern.trim();
  if (!value) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    // URL 实现可能将星号编码为 %2A；规则中的星号必须保留为通配符。
    return url.hostname.toLowerCase().replace(/%2a/gi, '*').replace(/\.$/, '');
  } catch {
    // 单条非法规则不能让整个名单失效，否则页面伪装和请求头规则都会停止工作。
    return '';
  }
}

/** 两个配置页面共用名单解析，保存标准化且去重的规则。 */
export function normalizeDomainList(patterns: string[]): string[] {
  return [...new Set(patterns.map(normalizeDomain).filter(Boolean))];
}

/** 页面和 DNR 共用同一域名正则；*.domain 同时包含主域名。 */
export function domainPatternSource(pattern: string): string {
  const normalized = normalizeDomain(pattern);
  const includesSubdomains = normalized.startsWith('*.');
  const host = includesSubdomains ? normalized.slice(2) : normalized;
  const source = host.split('*')
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^/?#:]*');
  return includesSubdomains ? `(?:[^/?#:]+\\.)?${source}` : source;
}

export function matchDomain(domain: string, pattern: string): boolean {
  const normalized = normalizeDomain(pattern);
  if (!domain || !normalized) return false;
  return new RegExp(`^${domainPatternSource(normalized)}$`, 'i').test(normalizeDomain(domain));
}

export function matchDomainList(domain: string, patterns: string[]): boolean {
  return patterns.some(pattern => matchDomain(domain, pattern));
}

export function shouldEnableSpoofing(
  domain: string,
  matchMode: 'global' | 'whitelist' | 'blacklist',
  domainList: string[]
): boolean {
  if (!domain) return false;
  if (matchMode === 'global') return true;
  const matched = matchDomainList(domain, domainList);
  return matchMode === 'whitelist' ? matched : !matched;
}

// 验证码沙箱在所有模式下优先豁免。
export const SECURITY_CHALLENGE_DOMAINS = [
  'challenges.cloudflare.com', 'cloudflarechallenge.com', 'cloudflarecaptcha.com',
  'hcaptcha.com', 'recaptcha.net', 'arkoselabs.com', 'funcaptcha.com'
];

export function isSecurityChallenge(hostname: string): boolean {
  return SECURITY_CHALLENGE_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
}

/** 总开关和验证码豁免优先，其次是仅当前域名的站点例外。 */
export function isSiteEnabled(hostname: string, config: PrivacyConfig): boolean {
  if (!hostname || !config.globalEnabled || isSecurityChallenge(hostname)) return false;
  return config.siteRules[hostname]?.enabled
    ?? shouldEnableSpoofing(hostname, config.matchMode, config.domainList);
}
