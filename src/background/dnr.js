const ACCEPT_LANGUAGE_RULE_ID = 1;
export async function updateAcceptLanguageRule(config) {
    if (!config.globalEnabled || !config.language.enabled) {
        await clearAcceptLanguageRule();
        return;
    }
    try {
        const rules = [
            {
                id: ACCEPT_LANGUAGE_RULE_ID,
                priority: 1,
                action: {
                    type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                    requestHeaders: [
                        {
                            header: 'Accept-Language',
                            operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                            value: config.language.acceptLanguage
                        }
                    ]
                },
                condition: {
                    urlFilter: '*',
                    resourceTypes: [
                        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
                        chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
                        chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST
                    ]
                }
            }
        ];
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [ACCEPT_LANGUAGE_RULE_ID],
            addRules: rules
        });
    }
    catch (error) {
        console.error('Failed to update Accept-Language rule:', error);
    }
}
export async function clearAcceptLanguageRule() {
    try {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [ACCEPT_LANGUAGE_RULE_ID]
        });
    }
    catch (error) {
        console.error('Failed to clear Accept-Language rule:', error);
    }
}
