import type { PrivacyConfig } from '../shared/types';
import { domainPatternSource, normalizeDomainList, SECURITY_CHALLENGE_DOMAINS } from '../shared/domain-matcher';

const ACCEPT_LANGUAGE_RULE_ID_START = 1;
const ACCEPT_LANGUAGE_RULE_ID_END = 1000;

// DNR 默认不匹配 main_frame，必须显式列出，否则页面导航会发送真实的 Accept-Language。
const ACCEPT_LANGUAGE_RESOURCE_TYPES = Object.values(chrome.declarativeNetRequest.ResourceType);

/** 使用与页面相同的域名边界，避免 requestDomains 隐式匹配子域名。 */
function createRuleCondition(pattern: string): chrome.declarativeNetRequest.RuleCondition {
  return {
    regexFilter: `^https?://(?:[^/?#@]*@)?${domainPatternSource(pattern)}(?::[0-9]+)?(?:[/?#]|$)`,
    isUrlFilterCaseSensitive: false,
    resourceTypes: ACCEPT_LANGUAGE_RESOURCE_TYPES
  };
}

function buildAcceptLanguageRules(config: PrivacyConfig): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = [];
  const addRule = (pattern: string, enabled: boolean, priority: number) => {
    rules.push({
      id: ACCEPT_LANGUAGE_RULE_ID_START + rules.length,
      priority,
      action: enabled ? {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        requestHeaders: [{
          header: 'Accept-Language',
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: config.language.acceptLanguage
        }]
      } : { type: chrome.declarativeNetRequest.RuleActionType.ALLOW },
      condition: createRuleCondition(pattern)
    });
  };

  // 1. 全局/黑名单默认启用；白名单仅启用匹配项。
  if (config.matchMode !== 'whitelist') addRule('*', true, 1);
  if (config.matchMode !== 'global') {
    for (const pattern of normalizeDomainList(config.domainList)) {
      addRule(pattern, config.matchMode === 'whitelist', config.matchMode === 'whitelist' ? 1 : 2);
    }
  }

  // 2. 站点例外只作用于精确域名，优先于两种名单。
  for (const [hostname, rule] of Object.entries(config.siteRules)) {
    addRule(hostname, rule.enabled, 3);
  }

  // 3. 验证码沙箱始终豁免，站点例外也不能覆盖。
  for (const hostname of SECURITY_CHALLENGE_DOMAINS) addRule(`*.${hostname}`, false, 4);
  if (rules.length > ACCEPT_LANGUAGE_RULE_ID_END) throw new Error('Too many Accept-Language rules');
  return rules;
}

async function getAcceptLanguageRuleIds(): Promise<number[]> {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  return rules
    .map(rule => rule.id)
    .filter(id => id >= ACCEPT_LANGUAGE_RULE_ID_START && id <= ACCEPT_LANGUAGE_RULE_ID_END);
}

export async function updateAcceptLanguageRule(config: PrivacyConfig): Promise<void> {
  if (!config.globalEnabled || !config.language.enabled) {
    await clearAcceptLanguageRule();
    return;
  }

  try {
    const removeRuleIds = await getAcceptLanguageRuleIds();
    const rules = buildAcceptLanguageRules(config);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: rules
    });
  } catch (error) {
    console.error('Failed to update Accept-Language rule:', error);
  }
}

export async function clearAcceptLanguageRule(): Promise<void> {
  try {
    const removeRuleIds = await getAcceptLanguageRuleIds();

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds
    });
  } catch (error) {
    console.error('Failed to clear Accept-Language rule:', error);
  }
}
