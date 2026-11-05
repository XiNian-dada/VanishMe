import { getConfig } from '../shared/storage';
import type { PrivacyConfig } from '../shared/types';

const SCRIPT_ID = 'vm-injected';
const INJECTED_FILE = 'injected/injected.js';

// 用户在扩展详情页打开“允许用户脚本”后 chrome.userScripts 才可调用。
export async function isUserScriptsAvailable(): Promise<boolean> {
  try {
    await (chrome as any).userScripts.getScripts();
    return true;
  } catch {
    return false;
  }
}

async function unregisterContentScript(): Promise<void> {
  const scripts = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (scripts.length > 0) await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
}

/** 配置写进代码，与 injected.js 同一任务内同步执行，首次加载也先于页面脚本。 */
async function registerUserScript(config: PrivacyConfig): Promise<void> {
  const userScripts = (chrome as any).userScripts;
  const script = {
    id: SCRIPT_ID,
    matches: ['<all_urls>'],
    runAt: 'document_start',
    world: 'MAIN',
    allFrames: true,
    js: [{ code: `window.__vm_boot__=${JSON.stringify(config)};` }, { file: INJECTED_FILE }]
  };
  const existing = await userScripts.getScripts({ ids: [SCRIPT_ID] });
  if (existing.length > 0) await userScripts.update([script]);
  else await userScripts.register([script]);
}

/** 未开启用户脚本时注册普通脚本，由 injected.js 回退到会话缓存。 */
async function registerContentScript(): Promise<void> {
  const scripts = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (scripts.length > 0) return;
  await chrome.scripting.registerContentScripts([{
    id: SCRIPT_ID,
    matches: ['<all_urls>'],
    js: [INJECTED_FILE],
    runAt: 'document_start',
    allFrames: true,
    world: 'MAIN',
    matchOriginAsFallback: true
  } as chrome.scripting.RegisteredContentScript]);
}

// 串行执行，避免 Service Worker 唤醒与配置变更同时注册时 ID 冲突。
let queue: Promise<unknown> = Promise.resolve();

/** 两种注入方式只保留一种，否则 injected.js 会在页面中运行两次。返回首次加载保护是否生效。 */
export function syncInjection(): Promise<boolean> {
  const run = queue.then(async () => {
    if (await isUserScriptsAvailable()) {
      await registerUserScript(await getConfig());
      await unregisterContentScript();
      return true;
    }
    await registerContentScript();
    return false;
  });
  queue = run.catch(() => undefined);
  return run;
}
