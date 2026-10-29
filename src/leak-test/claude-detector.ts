import type { CheckItem, ChineseLeakResult, IpGeoInfo } from './types';

export const CHINESE_FONTS_DATABASE = [
  // Windows 简体中文字体
  'Microsoft YaHei',
  'Microsoft YaHei UI',
  'SimSun',
  'NSimSun',
  'SimHei',
  'KaiTi',
  'FangSong',
  'DengXian',
  // macOS 简体中文字体
  'PingFang SC',
  'Hiragino Sans GB',
  'STHeiti',
  'STSong',
  'Songti SC',
  'Kaiti SC',
  'Yuanti SC',
  'Baoli SC',
  'Xingkai SC',
  'Wawati SC',
  'Yuppy SC',
  'Weibei SC',
  'LingWai SC',
  'Hanzipen SC',
  // Linux / Android / 开源中文字体
  'Source Han Sans CN',
  'Source Han Sans SC',
  'Noto Sans CJK SC',
  'Noto Serif CJK SC',
  'WenQuanYi Micro Hei',
  'WenQuanYi Zen Hei',
  // 繁体中文及 macOS 繁体字库
  'Microsoft JhengHei',
  'PingFang TC',
  'PingFang HK',
  'PMingLiU',
  'MingLiU',
  'DFKai-SB',
  'Source Han Sans TW',
  'Noto Sans CJK TC',
  'BiauKai',
  'LiHei Pro',
  'LiSong Pro',
  'Apple LiGothic',
  'Apple LiSung'
];

export const CHINESE_TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Chongqing',
  'Asia/Harbin',
  'Asia/Urumqi',
  'Asia/Kashgar',
  'PRC'
];

/**
 * 严格探测中文字体是否安装或被成功伪装
 */
export function detectFont(fontName: string): { installed: boolean; masked: boolean } {
  if (typeof document === 'undefined') {
    return { installed: false, masked: false };
  }

  // 1. 尝试使用 document.fonts.check API
  let fontsCheckResult = false;
  try {
    if (document.fonts && typeof document.fonts.check === 'function') {
      fontsCheckResult = document.fonts.check(`16px "${fontName}"`);
    }
  } catch {}

  // 2. 使用 Canvas measureText 多重基准差分对比算法
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { installed: fontsCheckResult, masked: false };
  }

  const testString = '一二三四五六七八九十测试abc123!@#';
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  let diffCount = 0;

  for (const base of baseFonts) {
    ctx.font = `72px ${base}`;
    const baseWidth = ctx.measureText(testString).width;

    ctx.font = `72px "${fontName}", ${base}`;
    const targetWidth = ctx.measureText(testString).width;

    if (Math.abs(baseWidth - targetWidth) > 0.5) {
      diffCount++;
    }
  }

  const canvasDetected = diffCount >= 2;
  const installed = canvasDetected || fontsCheckResult;

  // 检测是否命中 VanishMe 字体屏蔽规则（被替换为 fallback 或 document.fonts.check 返回 false）
  const fontKey = fontName.toLowerCase().replace(/[\s"'-]/g, '');
  const maskedSet = (window as any).__vm_masked_fonts;
  const isMaskedInConfig = Boolean(
    maskedSet && (maskedSet.has?.(fontKey) || maskedSet.has?.(fontName))
  );
  const masked = !installed && isMaskedInConfig;

  return { installed, masked };
}

/**
 * 扫描全部中文字体库
 */
export function scanChineseFonts(): { detected: string[]; masked: string[] } {
  const detected: string[] = [];
  const masked: string[] = [];

  for (const font of CHINESE_FONTS_DATABASE) {
    const res = detectFont(font);
    if (res.installed) {
      detected.push(font);
    } else if (res.masked) {
      masked.push(font);
    }
  }

  return { detected, masked };
}

/**
 * 扫描系统语音合成模型是否存在中文发音人
 */
export function scanChineseVoices(): string[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return [];
  }

  const voices = window.speechSynthesis.getVoices();
  const chineseVoices: string[] = [];

  for (const voice of voices) {
    const lang = (voice.lang || '').toLowerCase();
    const name = (voice.name || '').toLowerCase();

    if (
      lang.includes('zh') ||
      lang.includes('cmn') ||
      lang.includes('yue') ||
      name.includes('ting-ting') ||
      name.includes('sin-ji') ||
      name.includes('mei-jia') ||
      name.includes('xiaoxiao') ||
      name.includes('yunxi') ||
      name.includes('yaoyao') ||
      name.includes('huihui') ||
      name.includes('kangkang') ||
      name.includes('chinese')
    ) {
      chineseVoices.push(`${voice.name} (${voice.lang})`);
    }
  }

  return chineseVoices;
}

/**
 * 深度评估是否会被 Claude Code / OpenAI 判定为中国大陆用户 ("你是中国人吗" 检测器)
 */
export function evaluateChineseRisk(
  targetWin: any = window,
  ipInfo?: IpGeoInfo,
  geoCoords?: { latitude: number; longitude: number }
): {
  result: ChineseLeakResult;
  checks: CheckItem[];
} {
  const checks: CheckItem[] = [];
  let riskPoints = 0;

  // 1. 时区检测 (Timezone)
  let tz = 'Unknown';
  try {
    tz = new targetWin.Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
  } catch {}

  const isChineseTz = CHINESE_TIMEZONES.includes(tz);
  if (isChineseTz) {
    riskPoints += 35;
    checks.push({
      id: 'claude-tz',
      name: '系统/浏览器时区',
      category: 'claude',
      status: 'fail',
      actualValue: tz,
      expectedValue: '海外时区 (如 America/Los_Angeles, Asia/Tokyo)',
      riskDescription: `时区为 ${tz}，属于中国大陆时区范围，Claude/OpenAI 直接判定为限制地区`,
      recommendation: '在 VanishMe 中切换为海外预设（如 US West 或 Singapore）'
    });
  } else {
    checks.push({
      id: 'claude-tz',
      name: '系统/浏览器时区',
      category: 'claude',
      status: 'pass',
      actualValue: tz,
      expectedValue: '海外时区',
      riskDescription: '时区安全，非中国大陆时区'
    });
  }

  // 2. 时区偏移量检测 (Timezone Offset)
  const offset = new targetWin.Date().getTimezoneOffset();
  const isChineseOffset = offset === -480; // UTC+8
  if (isChineseOffset) {
    riskPoints += isChineseTz ? 15 : 25; // 即使时区改了，如果 offset 还是 -480 说明仅改了表面名字
    checks.push({
      id: 'claude-offset',
      name: '时区偏移量 (Offset)',
      category: 'claude',
      status: isChineseTz ? 'fail' : 'warn',
      actualValue: `UTC+8 (${offset} 分钟)`,
      expectedValue: '与代理出口匹配的偏移量 (如 UTC-7, UTC-4)',
      riskDescription: '时区偏移为 UTC+8，与中国标准时间一致',
      recommendation: '确保 VanishMe 时区保护开启并生效'
    });
  } else {
    const hours = Math.abs(offset / 60);
    const sign = offset > 0 ? '-' : '+';
    checks.push({
      id: 'claude-offset',
      name: '时区偏移量 (Offset)',
      category: 'claude',
      status: 'pass',
      actualValue: `UTC${sign}${hours} (${offset} 分钟)`,
      expectedValue: '海外时区偏移',
      riskDescription: '时区偏移安全'
    });
  }

  // 3. Date.prototype.toString 泄漏
  const dateStr = new targetWin.Date().toString();
  const hasChineseTzName =
    dateStr.includes('中国标准时间') ||
    dateStr.includes('China Standard Time') ||
    dateStr.includes('GMT+0800');

  if (hasChineseTzName) {
    riskPoints += 20;
    checks.push({
      id: 'claude-datestr',
      name: 'Date.toString() 字符串',
      category: 'claude',
      status: 'fail',
      actualValue: dateStr,
      expectedValue: '不含“中国标准时间”的海外时间字串',
      riskDescription: 'Date.toString() 泄露了中国标准时间或 GMT+0800 标识',
      recommendation: '开启 VanishMe 时区保护，自动伪装 Date.prototype.toString'
    });
  } else {
    checks.push({
      id: 'claude-datestr',
      name: 'Date.toString() 字符串',
      category: 'claude',
      status: 'pass',
      actualValue: dateStr.length > 40 ? `${dateStr.slice(0, 40)}...` : dateStr,
      expectedValue: '海外时间字串',
      riskDescription: '无中国时区字串泄漏'
    });
  }

  // 4. 浏览器首选语言 (navigator.language)
  const navLang = targetWin.navigator.language || '';
  const isChineseLang = navLang.toLowerCase().startsWith('zh');
  if (isChineseLang) {
    riskPoints += 30;
    checks.push({
      id: 'claude-lang',
      name: '浏览器首选语言 (navigator.language)',
      category: 'claude',
      status: 'fail',
      actualValue: navLang,
      expectedValue: 'en-US 或海外语言',
      riskDescription: `语言为 ${navLang}，顶级 AI 网站会直接识别为中文环境并触发高等级风控`,
      recommendation: '在 VanishMe 中开启语言伪装（如 en-US）'
    });
  } else {
    checks.push({
      id: 'claude-lang',
      name: '浏览器首选语言 (navigator.language)',
      category: 'claude',
      status: 'pass',
      actualValue: navLang,
      expectedValue: 'en-US / 纯海外语言',
      riskDescription: '首选语言安全'
    });
  }

  // 5. 语言列表 (navigator.languages)
  const navLangs = targetWin.navigator.languages ? [...targetWin.navigator.languages] : [];
  const hasChineseInLangs = navLangs.some(l => l.toLowerCase().startsWith('zh'));
  if (hasChineseInLangs) {
    riskPoints += 20;
    checks.push({
      id: 'claude-langs',
      name: '备用语言列表 (navigator.languages)',
      category: 'claude',
      status: 'fail',
      actualValue: navLangs.join(', '),
      expectedValue: '不含 zh / zh-CN 的语言列表',
      riskDescription: `语言列表中包含中文语言项 [${navLangs.filter(l => l.toLowerCase().startsWith('zh')).join(', ')}]`,
      recommendation: '在 VanishMe 配置中清理中文备用语言'
    });
  } else {
    checks.push({
      id: 'claude-langs',
      name: '备用语言列表 (navigator.languages)',
      category: 'claude',
      status: 'pass',
      actualValue: navLangs.join(', ') || 'None',
      expectedValue: '海外纯净语言列表',
      riskDescription: '语言列表无中文泄漏'
    });
  }

  // 6. Intl Locale & 格式化测试 (全套 7 种 Intl API + 本地化日期深度扫描)
  let intlLocale = '';
  let dateFormatHasChinese = false;
  let relativeTimeHasChinese = false;
  let listFormatHasChinese = false;
  let dateLocaleStringHasChinese = false;
  let collatorLocale = '';
  let numberFormatLocale = '';

  try {
    const dtf = new targetWin.Intl.DateTimeFormat();
    intlLocale = dtf.resolvedOptions().locale || '';
    const formatted = dtf.format(new Date());
    dateFormatHasChinese = /[\u4e00-\u9fa5]/.test(formatted);
  } catch {}

  try {
    if (targetWin.Intl?.RelativeTimeFormat) {
      const rtf = new targetWin.Intl.RelativeTimeFormat();
      const relStr = rtf.format(-1, 'day');
      relativeTimeHasChinese = /[\u4e00-\u9fa5]/.test(relStr);
    }
  } catch {}

  try {
    if (targetWin.Intl?.ListFormat) {
      const lf = new targetWin.Intl.ListFormat();
      const listStr = lf.format(['Apple', 'Banana']);
      listFormatHasChinese = /[\u4e00-\u9fa5、]/.test(listStr);
    }
  } catch {}

  try {
    if (targetWin.Intl?.Collator) {
      const col = new targetWin.Intl.Collator();
      collatorLocale = col.resolvedOptions().locale || '';
    }
  } catch {}

  try {
    if (targetWin.Intl?.NumberFormat) {
      const nf = new targetWin.Intl.NumberFormat();
      numberFormatLocale = nf.resolvedOptions().locale || '';
    }
  } catch {}

  try {
    const d = new targetWin.Date();
    const lds = d.toLocaleDateString();
    const lts = d.toLocaleTimeString();
    dateLocaleStringHasChinese = /[\u4e00-\u9fa5]/.test(lds + lts);
  } catch {}

  const isZhLocale = (loc: string) => (loc || '').toLowerCase().startsWith('zh');
  const intlLeak =
    isZhLocale(intlLocale) ||
    isZhLocale(collatorLocale) ||
    isZhLocale(numberFormatLocale) ||
    dateFormatHasChinese ||
    relativeTimeHasChinese ||
    listFormatHasChinese ||
    dateLocaleStringHasChinese;

  if (intlLeak) {
    riskPoints += 25;
    checks.push({
      id: 'claude-intl',
      name: 'Intl 国际化 API 解析 (全套 7 种 Intl 深度扫描)',
      category: 'claude',
      status: 'fail',
      actualValue: `Locale: ${intlLocale || '未知'}, 日期含中文: ${dateFormatHasChinese ? '是' : '否'}, 相对时间含中文: ${relativeTimeHasChinese ? '是' : '否'}, 列表含中文: ${listFormatHasChinese ? '是' : '否'}`,
      expectedValue: 'Locale: en-US, 纯英文格式',
      riskDescription: '全套 Intl 国际化解析中检出中文区域或汉字排版（如“昨天”、“年月日”、“和/、”或“上午/下午”），顶级商业 WAF 依此定性真实语种',
      recommendation: '在 VanishMe 中开启语言与时区协同伪装'
    });
  } else {
    checks.push({
      id: 'claude-intl',
      name: 'Intl 国际化 API 解析 (全套 7 种 Intl 深度扫描)',
      category: 'claude',
      status: 'pass',
      actualValue: `Locale: ${intlLocale || 'en-US'} (纯英美海外排版，全套 Intl API 严格校验)`,
      expectedValue: '海外区域',
      riskDescription: 'Intl 格式化行为与海外环境一致'
    });
  }

  // 7. 中文字体泄露探测 (极其致命的硬件特征)
  const fontScan = scanChineseFonts();
  if (fontScan.detected.length > 0) {
    const pts = Math.min(30, 10 + fontScan.detected.length * 4);
    riskPoints += pts;
    checks.push({
      id: 'claude-fonts',
      name: '本地中文字体特征嗅探 (45+ 库)',
      category: 'claude',
      status: fontScan.detected.length >= 3 ? 'fail' : 'warn',
      actualValue: `检出 ${fontScan.detected.length} 种中文字体: [${fontScan.detected.slice(0, 4).join(', ')}${fontScan.detected.length > 4 ? '...' : ''}]`,
      expectedValue: '0 种中文字体 (纯净海外环境)',
      riskDescription: '浏览器能检测出机器上装有微软雅黑/苹方/宋体等中文字体，Claude 等工具据此断定宿主机为中文系统',
      recommendation: '在 VanishMe 设置中开启【Canvas 字体混淆/屏蔽中文字体】功能'
    });
  } else {
    checks.push({
      id: 'claude-fonts',
      name: '本地中文字体特征嗅探 (45+ 库)',
      category: 'claude',
      status: 'pass',
      actualValue: '0 种中文字体泄露 (已成功防御或未安装)',
      expectedValue: '0 种中文字体',
      riskDescription: '中文字体特征已被完全隐匿'
    });
  }

  // 8. 系统语音模型 (SpeechSynthesis)
  const voices = scanChineseVoices();
  if (voices.length > 0) {
    riskPoints += 15;
    checks.push({
      id: 'claude-voices',
      name: '系统语音合成引擎 (Voices)',
      category: 'claude',
      status: 'warn',
      actualValue: `检出 ${voices.length} 个中文发音人: [${voices.slice(0, 2).join(', ')}...]`,
      expectedValue: '无中文语音模型',
      riskDescription: '系统注册了中文 TTS 发音库，部分商业指纹探针会枚举语音列表探测真实语种',
      recommendation: '建议在专用防关联环境或纯净系统下访问严苛风控网站'
    });
  } else {
    checks.push({
      id: 'claude-voices',
      name: '系统语音合成引擎 (Voices)',
      category: 'claude',
      status: 'pass',
      actualValue: '无中文发音人泄露',
      expectedValue: '无中文语音',
      riskDescription: '语音引擎特征安全'
    });
  }

  // 9. 物理地理位置中国边界判断 (18°N~54°N, 73°E~135°E)
  let geoInChina = false;
  if (geoCoords && typeof geoCoords.latitude === 'number' && typeof geoCoords.longitude === 'number') {
    const { latitude: lat, longitude: lon } = geoCoords;
    if (lat >= 18.0 && lat <= 54.0 && lon >= 73.0 && lon <= 135.0) {
      geoInChina = true;
      riskPoints += 40;
      checks.push({
      id: 'claude-geo',
      name: '地理位置中国国界校验',
      category: 'claude',
      status: 'fail',
      actualValue: `纬度 ${lat.toFixed(4)}, 经度 ${lon.toFixed(4)} (位于中国境内)`,
      expectedValue: '海外地理坐标',
      riskDescription: 'Geolocation 坐标落在中国大陆版图内，AI 网站直接封锁访问',
      recommendation: '在 VanishMe 中配置海外经纬度（如新加坡 1.3521, 103.8198）'
    });
    } else {
      checks.push({
        id: 'claude-geo',
        name: '地理位置中国国界校验',
        category: 'claude',
        status: 'pass',
        actualValue: `纬度 ${lat.toFixed(4)}, 经度 ${lon.toFixed(4)} (海外坐标)`,
        expectedValue: '海外坐标',
        riskDescription: '地理坐标安全，位于海外'
      });
    }
  }

  // 10. IP 与浏览器时区交叉一致性 (Cross-check fatal mismatch)
  if (ipInfo && ipInfo.countryCode && ipInfo.timezone) {
    const isIpUSorOverseas = ipInfo.countryCode !== 'CN';
    if (isIpUSorOverseas && (isChineseTz || isChineseOffset)) {
      riskPoints += 35;
      checks.push({
        id: 'claude-mismatch',
        name: '出口 IP 与浏览器环境交叉核验 (致命冲突)',
        category: 'claude',
        status: 'fail',
        actualValue: `出口 IP 在 ${ipInfo.countryCode || '海外'} (${ipInfo.timezone || 'UTC'})，但浏览器为 UTC+8 / ${tz}`,
        expectedValue: 'IP 时区与浏览器时区 100% 吻合',
        riskDescription: '代理 IP 位于海外，但浏览器时区为中国大陆！这是触发 Claude/ChatGPT 封号的首要特征！',
        recommendation: '开启 VanishMe 自动 IP 时区同步或切换至与代理匹配的预设'
      });
    }
  }

  const finalScore = Math.min(100, riskPoints);
  let summary = '纯净海外环境，通过 Claude/OpenAI 区域风险筛查';
  if (finalScore >= 60) {
    summary = '极度高危！强烈中国大陆环境特征，100% 会被 Claude/OpenAI 识别并封禁';
  } else if (finalScore >= 25) {
    summary = '存在可疑特征泄露，有较大概率触发额外人机验证或封控';
  }

  return {
    result: {
      timezoneLeaked: isChineseTz,
      timezoneValue: tz,
      offsetLeaked: isChineseOffset,
      offsetValue: offset,
      dateStringLeaked: hasChineseTzName,
      dateStringValue: dateStr,
      languageLeaked: isChineseLang,
      languageValue: navLang,
      languagesLeaked: hasChineseInLangs,
      languagesValue: navLangs,
      intlLocaleLeaked: intlLocale.toLowerCase().startsWith('zh'),
      intlLocaleValue: intlLocale,
      intlFormatLeaked: dateFormatHasChinese,
      chineseFontsDetected: fontScan.detected,
      chineseFontsMasked: fontScan.masked,
      chineseVoicesDetected: voices,
      geoInChina,
      geoCoords: geoCoords ? { lat: geoCoords.latitude, lon: geoCoords.longitude } : undefined,
      totalRiskPoints: finalScore,
      summary
    },
    checks
  };
}
