/**
 * 域名匹配工具
 * 支持通配符匹配：
 * - 精确匹配：example.com
 * - 前缀通配符：*.example.com (匹配所有子域名)
 * - 后缀通配符：example.* (匹配所有 TLD)
 * - 关键词匹配：*keyword* (匹配包含关键词的域名)
 * - 完全通配符：* (匹配所有域名)
 */

/**
 * 将通配符模式转换为正则表达式
 */
function patternToRegex(pattern: string): RegExp {
  // 转义特殊字符，但保留 *
  let regexStr = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // 转义除 * 外的特殊字符
    .replace(/\*/g, '.*');  // 将 * 转换为 .*

  // 确保完全匹配（添加 ^ 和 $）
  regexStr = '^' + regexStr + '$';

  return new RegExp(regexStr, 'i');  // 不区分大小写
}

/**
 * 检查域名是否匹配给定的模式
 */
export function matchDomain(domain: string, pattern: string): boolean {
  if (!domain || !pattern) return false;

  // 标准化域名（移除协议、端口、路径）
  domain = domain.toLowerCase().trim();
  pattern = pattern.toLowerCase().trim();

  // 移除协议前缀
  domain = domain.replace(/^https?:\/\//, '');
  pattern = pattern.replace(/^https?:\/\//, '');

  // 只保留域名部分（移除端口和路径）
  domain = domain.split(':')[0].split('/')[0];
  pattern = pattern.split(':')[0].split('/')[0];

  // 精确匹配（无通配符）
  if (!pattern.includes('*')) {
    return domain === pattern;
  }

  // 使用正则表达式匹配
  const regex = patternToRegex(pattern);
  return regex.test(domain);
}

/**
 * 检查域名是否匹配列表中的任意一个模式
 */
export function matchDomainList(domain: string, patterns: string[]): boolean {
  if (!domain || !patterns || patterns.length === 0) return false;

  return patterns.some(pattern => matchDomain(domain, pattern));
}

/**
 * 根据匹配模式和域名列表判断是否应该启用伪装
 */
export function shouldEnableSpoofing(
  domain: string,
  matchMode: 'global' | 'whitelist' | 'blacklist',
  domainList: string[]
): boolean {
  if (!domain) return false;

  switch (matchMode) {
    case 'global':
      // 全局模式：对所有网站启用
      return true;

    case 'whitelist':
      // 白名单模式：只对列表中的网站启用
      return matchDomainList(domain, domainList);

    case 'blacklist':
      // 黑名单模式：对除列表外的所有网站启用
      return !matchDomainList(domain, domainList);

    default:
      return false;
  }
}
