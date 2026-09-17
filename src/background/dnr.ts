import type { PrivacyConfig } from '../shared/types';

const ACCEPT_LANGUAGE_RULE_ID_START = 1;
const ACCEPT_LANGUAGE_RULE_ID_END = 1000;

const ACCEPT_LANGUAGE_RESOURCE_TYPES = [
  chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
  chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
  chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizePattern(pattern: string): string | null {
  const trimmed = pattern.trim().toLowerCase();
  if (!trimmed) return null;

  const withoutProtocol = trimmed.replace(/^https?:\/\//, '');
  const domainOnly = withoutProtocol.split('/')[0].split(':')[0];

  return domainOnly || null;
}

function patternToUrlRegex(pattern: string): string | null {
  const normalized = normalizePattern(pattern);
  if (!normalized) return null;

  if (normalized === '*') {
    return '^https?://';
  }

  const hostPattern = normalized
    .split('*')
    .map(escapeRegex)
    .join('[^/?#:]*');

  return `^https?://(?:[^/?#@]*@)?${hostPattern}(?::[0-9]+)?(?:[/?#]|$)`;
}

function exactDomains(patterns: string[]): string[] {
  const domains: string[] = [];

  patterns.forEach(pattern => {
    const normalized = normalizePattern(pattern);
    if (normalized && normalized !== '*' && !normalized.includes('*')) {
      domains.push(normalized);
    }
  });

  return domains;
}

function createRuleCondition(
  pattern?: string,
  excludedDomains: string[] = []
): chrome.declarativeNetRequest.RuleCondition | null {
  const condition: chrome.declarativeNetRequest.RuleCondition = {};

  if (excludedDomains.length > 0) {
    condition.excludedRequestDomains = excludedDomains;
  }

  if (!pattern || pattern === '*') {
    condition.urlFilter = '|http*';
    return condition;
  }

  const normalized = normalizePattern(pattern);
  if (!normalized) return null;

  // Exact domain or *.domain wildcard: requestDomains natively matches the domain and all subdomains!
  // e.g. 'browserscan.net' matches 'browserscan.net', 'www.browserscan.net', etc.
  if (!normalized.includes('*')) {
    condition.requestDomains = [normalized];
    return condition;
  }

  if (normalized.startsWith('*.')) {
    const rootDomain = normalized.slice(2);
    if (!rootDomain.includes('*')) {
      condition.requestDomains = [rootDomain];
      return condition;
    }
  }

  const regexFilter = patternToUrlRegex(pattern);
  if (!regexFilter) {
    return null;
  }

  condition.regexFilter = regexFilter;
  condition.isUrlFilterCaseSensitive = false;
  return condition;
}

function createModifyHeaderRule(
  id: number,
  acceptLanguage: string,
  condition: chrome.declarativeNetRequest.RuleCondition,
  priority = 1
): chrome.declarativeNetRequest.Rule {
  return {
    id,
    priority,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      requestHeaders: [
        {
          header: 'Accept-Language',
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: acceptLanguage
        }
      ]
    },
    condition
  };
}

function createAllowRule(
  id: number,
  condition: chrome.declarativeNetRequest.RuleCondition,
  priority = 2
): chrome.declarativeNetRequest.Rule {
  return {
    id,
    priority,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.ALLOW
    },
    condition
  };
}

function buildAcceptLanguageRules(config: PrivacyConfig): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = [];
  let nextRuleId = ACCEPT_LANGUAGE_RULE_ID_START;

  const nextId = () => {
    if (nextRuleId > ACCEPT_LANGUAGE_RULE_ID_END) {
      throw new Error('Too many Accept-Language rules');
    }

    return nextRuleId++;
  };

  const siteRuleEntries = Object.entries(config.siteRules || {});
  const enabledSiteRules = siteRuleEntries
    .filter(([, rule]) => rule.enabled)
    .map(([hostname]) => hostname);
  const disabledSiteRules = siteRuleEntries
    .filter(([, rule]) => !rule.enabled)
    .map(([hostname]) => hostname);

  const addModifyRule = (pattern: string, priority = 1, excludedDomains: string[] = []) => {
    const condition = createRuleCondition(pattern, excludedDomains);
    if (condition) {
      rules.push(createModifyHeaderRule(nextId(), config.language.acceptLanguage, condition, priority));
    }
  };

  const addAllowRule = (pattern: string, priority = 2) => {
    const condition = createRuleCondition(pattern);
    if (condition) {
      rules.push(createAllowRule(nextId(), condition, priority));
    }
  };

  switch (config.matchMode) {
    case 'whitelist': {
      const disabledDomains = exactDomains(disabledSiteRules);
      [...(config.domainList || []), ...enabledSiteRules].forEach(pattern => {
        addModifyRule(pattern, 1, disabledDomains);
      });
      break;
    }

    case 'blacklist': {
      const excludedPatterns = [...(config.domainList || []), ...disabledSiteRules];
      const excludedDomains = exactDomains(excludedPatterns);

      excludedPatterns.forEach(pattern => {
        addAllowRule(pattern, 2);
      });

      const globalCondition = createRuleCondition(undefined, excludedDomains);
      if (globalCondition) {
        rules.push(createModifyHeaderRule(nextId(), config.language.acceptLanguage, globalCondition));
      }

      enabledSiteRules.forEach(pattern => {
        addModifyRule(pattern, 3);
      });
      break;
    }

    case 'global':
    default: {
      const disabledDomains = exactDomains(disabledSiteRules);

      disabledSiteRules.forEach(pattern => {
        addAllowRule(pattern, 2);
      });

      const globalCondition = createRuleCondition(undefined, disabledDomains);
      if (globalCondition) {
        rules.push(createModifyHeaderRule(nextId(), config.language.acceptLanguage, globalCondition));
      }
      break;
    }
  }

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
