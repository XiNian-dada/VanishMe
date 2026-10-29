import { makeNativeFunction } from './utils';

/**
 * 拦截并伪装系统语音合成引擎 (SpeechSynthesis)
 * 剔除本地已安装的中文字体发音人 (zh-CN, zh-HK, zh-TW, 婷婷, Eddy, Xiaoxiao 等)
 * 彻底消除 AI 探针通过枚举发音人语种识别中国用户的破绽
 */
export function installSpeechSpoof(targetWindow: any = window): void {
  const SpeechSynthesisProto = targetWindow.SpeechSynthesis?.prototype;
  if (!SpeechSynthesisProto && !targetWindow.speechSynthesis) return;

  const proto = SpeechSynthesisProto || targetWindow.speechSynthesis;
  const originalGetVoices = proto.getVoices;
  if (typeof originalGetVoices !== 'function') return;

  const isChineseVoice = (v: SpeechSynthesisVoice): boolean => {
    if (!v) return false;
    const lang = (v.lang || '').toLowerCase();
    const name = (v.name || '').toLowerCase();

    return (
      lang.startsWith('zh') ||
      lang.includes('cmn') ||
      lang.includes('yue') ||
      lang.includes('hans') ||
      lang.includes('hant') ||
      /[\u4e00-\u9fa5]/.test(v.name || '') ||
      name.includes('ting-ting') ||
      name.includes('sin-ji') ||
      name.includes('mei-jia') ||
      name.includes('xiaoxiao') ||
      name.includes('yunxi') ||
      name.includes('yaoyao') ||
      name.includes('huihui') ||
      name.includes('kangkang') ||
      name.includes('eddy') ||
      name.includes('chinese')
    );
  };

  const spoofedGetVoices = function getVoices(this: any): SpeechSynthesisVoice[] {
    const rawVoices = originalGetVoices.call(this);
    if (!Array.isArray(rawVoices)) return rawVoices;

    // 过滤掉所有中文特征发音人
    const filtered = rawVoices.filter(v => !isChineseVoice(v));
    return filtered;
  };

  proto.getVoices = makeNativeFunction(
    spoofedGetVoices,
    originalGetVoices,
    'getVoices'
  );

  // 如果实例本身有覆盖，也同步保护
  if (targetWindow.speechSynthesis && targetWindow.speechSynthesis.getVoices !== proto.getVoices) {
    targetWindow.speechSynthesis.getVoices = proto.getVoices;
  }
}
