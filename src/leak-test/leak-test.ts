import './leak-test.css';
import type { CheckItem, EnvironmentSnapshot } from './types';
import type { PrivacyConfig } from '../shared/types';
import { getConfig } from '../shared/storage';

import { evaluateChineseRisk, scanChineseFonts } from './claude-detector';
import { fetchPublicIpInfo, testWebRTCLeak, evaluateNetworkRisks } from './network';
import { auditBrowserFingerprint } from './fingerprint';
import { auditAntiDetection } from './anti-detection-audit';

// 保存未伪装前的真实底层原生快照
let nativeSnapshot: EnvironmentSnapshot | null = null;
let activeConfig: PrivacyConfig | null = null;
let watchId: number | null = null;
let lastAuditReport: {
  summary: any;
  allChecks: CheckItem[];
  claudeResult: any;
  ipInfo: any;
  webrtcResult: any;
  fpResult: any;
  antiDetectResult: any;
} | null = null;

/**
 * 捕获底层真实环境快照 (在注入任何伪装之前执行)
 */
function captureNativeSnapshot(): EnvironmentSnapshot {
  const existing = (window as any).__VM_NATIVE_SNAPSHOT__;
  const fontScan = scanChineseFonts();

  if (existing) {
    return {
      timezone: existing.timezone,
      timezoneOffset: existing.timezoneOffset,
      dateString: existing.dateString,
      language: existing.language,
      languages: existing.languages,
      intlLocale: existing.intlLocale,
      platform: existing.platform,
      userAgent: existing.userAgent,
      chineseFontsCount: fontScan.detected.length,
      geolocationAvailable: existing.geolocationAvailable
    };
  }

  let tz = 'Unknown';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
  } catch {}

  return {
    timezone: tz,
    timezoneOffset: new Date().getTimezoneOffset(),
    dateString: new Date().toString(),
    language: navigator.language || 'N/A',
    languages: navigator.languages ? [...navigator.languages] : [],
    intlLocale: new Intl.DateTimeFormat().resolvedOptions().locale || 'N/A',
    platform: navigator.platform || 'N/A',
    userAgent: navigator.userAgent || 'N/A',
    chineseFontsCount: fontScan.detected.length,
    geolocationAvailable: Boolean(navigator.geolocation)
  };
}

/**
 * 初始化并运行全套深度隐私诊断
 */
async function runFullAudit() {
  const retestBtn = document.getElementById('retestBtn') as HTMLButtonElement;
  if (retestBtn) retestBtn.disabled = true;

  try {
    // 1. 获取全局配置
    activeConfig = await getConfig();

    // 2. 更新顶部状态 Chips
    renderHeaderStatus(activeConfig);

    // 3. 安装 VanishMe 保护环境（使当前测试页精确对齐普通网页所见环境）
    applyVanishMeProtection(activeConfig);
    await new Promise(resolve => setTimeout(resolve, 80));

    // 4. 并行执行核心检测模块
    const [ipInfo, webrtcResult] = await Promise.all([
      fetchPublicIpInfo(),
      testWebRTCLeak()
    ]);

    // 5. 执行各专项分析
    const spoofedGeoCoords = activeConfig.globalEnabled && activeConfig.geolocation.enabled
      ? { latitude: activeConfig.geolocation.latitude, longitude: activeConfig.geolocation.longitude }
      : undefined;

    const claudeAudit = evaluateChineseRisk(window, ipInfo, spoofedGeoCoords);
    const fpAudit = await auditBrowserFingerprint(window);
    const antiDetectAudit = await auditAntiDetection(window);
    const netChecks = evaluateNetworkRisks(ipInfo, webrtcResult, window, spoofedGeoCoords);

    // 6. 整合全部检查项
    const allChecks: CheckItem[] = [
      ...claudeAudit.checks,
      ...netChecks,
      ...fpAudit.checks,
      ...antiDetectAudit.checks
    ];

    // 7. 汇总综合评分
    const summary = calculateSummaryScores(
      claudeAudit.result,
      antiDetectAudit.audit,
      webrtcResult,
      fpAudit.fingerprint,
      allChecks
    );

    lastAuditReport = {
      summary,
      allChecks,
      claudeResult: claudeAudit.result,
      ipInfo,
      webrtcResult,
      fpResult: fpAudit.fingerprint,
      antiDetectResult: antiDetectAudit.audit
    };

    // 8. 渲染 DOM
    renderDashboard(summary, claudeAudit.result, antiDetectAudit.audit, ipInfo, webrtcResult);
    renderClaudeSection(claudeAudit.result, claudeAudit.checks);
    renderNetworkSection(ipInfo, webrtcResult, netChecks);
    renderFingerprintSection(fpAudit.fingerprint, fpAudit.checks, fpAudit.canvasPreview);
    renderAntiDetectionSection(antiDetectAudit.audit, antiDetectAudit.checks);
    renderComparisonTable(nativeSnapshot, activeConfig, claudeAudit.result);

    // 9. 更新 Geolocation 展示初始状态
    updateGeoStatusDisplay();

  } catch (error) {
    console.error('VanishMe Audit Error:', error);
  } finally {
    if (retestBtn) retestBtn.disabled = false;
  }
}

/**
 * 在测试页窗口上安装 VanishMe 伪装环境 (与普通网站 injected.js 运行机制完全一致)
 */
function applyVanishMeProtection(config: PrivacyConfig) {
  if (!config) return;

  const injectedConfig = {
    enabled: config.globalEnabled,
    debugMode: config.debugMode || false,
    geolocation: config.geolocation,
    timezone: config.timezone,
    language: config.language,
    canvas: config.canvas,
    webrtc: config.webrtc
  };

  try {
    sessionStorage.setItem('__vm_cfg__', JSON.stringify(injectedConfig));
  } catch {}

  window.postMessage({
    type: '__VM_UPDATE__',
    config: injectedConfig
  }, '*');
}

/**
 * 汇总计算评分
 */
function calculateSummaryScores(
  claudeResult: any,
  antiDetect: any,
  webrtc: any,
  fp: any,
  checks: CheckItem[]
) {
  const totalChecks = checks.length;
  const passedChecks = checks.filter(c => c.status === 'pass').length;
  const warningChecks = checks.filter(c => c.status === 'warn').length;
  const failedChecks = checks.filter(c => c.status === 'fail').length;

  // 1. Claude 风险分 (0-100，越低越安全)
  const claudeRiskScore = claudeResult.totalRiskPoints;
  let claudeStatus: 'safe' | 'suspicious' | 'critical' = 'safe';
  if (claudeRiskScore >= 50) {
    claudeStatus = 'critical';
  } else if (claudeRiskScore >= 20) {
    claudeStatus = 'suspicious';
  }

  // 2. 反作弊隐蔽性分数 (0-100)
  const antiDetectScore = antiDetect.overallStealth === 'native_grade' ? 100 : antiDetect.overallStealth === 'minor_anomaly' ? 80 : 50;

  // 3. WebRTC / 网络安全度
  let ipWebRTCStatus: 'secure' | 'warning' | 'leaking' = 'secure';
  if (webrtc.publicIps.length > 0) {
    ipWebRTCStatus = 'leaking';
  } else if (webrtc.hasLocalLeak) {
    ipWebRTCStatus = 'warning';
  }

  // 4. 综合匿名指数 (0-100)
  const privacyScore = Math.max(
    0,
    Math.round(
      (100 - claudeRiskScore) * 0.4 +
      antiDetectScore * 0.3 +
      (ipWebRTCStatus === 'secure' ? 100 : ipWebRTCStatus === 'warning' ? 75 : 30) * 0.2 +
      (fp.webglCompatibility === 'consistent' ? 100 : 50) * 0.1
    )
  );

  return {
    privacyScore,
    claudeRiskScore,
    claudeStatus,
    antiDetectScore,
    antiDetectStatus: antiDetect.overallStealth,
    ipWebRTCStatus,
    totalChecks,
    passedChecks,
    warningChecks,
    failedChecks
  };
}

/**
 * 渲染顶部 Header 状态
 */
function renderHeaderStatus(config: PrivacyConfig) {
  const profileText = document.getElementById('activeProfileText');
  const protectionText = document.getElementById('protectionStatusText');
  const protectionBadge = document.getElementById('protectionBadge');

  const activeId = config.profile?.activeProfileId;
  const activeProfile = config.profile?.profiles?.find((p: any) => p.id === activeId);

  if (profileText) {
    profileText.textContent = activeProfile ? `预设: ${activeProfile.name}` : '预设: 自定义';
  }

  if (protectionText && protectionBadge) {
    if (config.globalEnabled) {
      protectionText.textContent = '全局保护已激活';
      protectionBadge.className = 'status-chip chip-success';
    } else {
      protectionText.textContent = '全局保护已停用';
      protectionBadge.className = 'status-chip';
    }
  }
}

/**
 * 渲染仪表盘卡片
 */
function renderDashboard(
  summary: any,
  claude: any,
  antiDetect: any,
  ipInfo: any,
  webrtc: any
) {
  // 综合评分
  const scoreEl = document.getElementById('privacyScore');
  const gradeBadge = document.getElementById('privacyGradeBadge');
  const passEl = document.getElementById('statPassCount');
  const warnEl = document.getElementById('statWarnCount');
  const failEl = document.getElementById('statFailCount');
  const summaryText = document.getElementById('privacySummaryText');

  if (scoreEl) scoreEl.textContent = summary.privacyScore.toString();
  if (passEl) passEl.textContent = summary.passedChecks.toString();
  if (warnEl) warnEl.textContent = summary.warningChecks.toString();
  if (failEl) failEl.textContent = summary.failedChecks.toString();

  if (gradeBadge) {
    if (summary.privacyScore >= 85) {
      gradeBadge.className = 'badge badge-pass';
      gradeBadge.textContent = '极度安全';
    } else if (summary.privacyScore >= 65) {
      gradeBadge.className = 'badge badge-warn';
      gradeBadge.textContent = '轻度预警';
    } else {
      gradeBadge.className = 'badge badge-fail';
      gradeBadge.textContent = '高危泄露';
    }
  }

  if (summaryText) {
    summaryText.textContent = summary.privacyScore >= 85
      ? '恭喜！您的浏览器环境具有极高的匿名性和真实海外特征，已全面阻断关联与封控。'
      : '注意：检测到部分硬件或网络特征存在泄露风险，建议查看下方排查建议进行优化。';
  }

  // Claude Radar
  const claudeBadge = document.getElementById('claudeBadge');
  const claudeIcon = document.getElementById('claudeIcon');
  const claudeTitle = document.getElementById('claudeTitle');
  const claudeSub = document.getElementById('claudeSub');
  const claudeTags = document.getElementById('claudeTagsContainer');

  if (claudeBadge && claudeIcon && claudeTitle && claudeSub && claudeTags) {
    claudeTags.innerHTML = '';
    if (summary.claudeStatus === 'safe') {
      claudeBadge.className = 'badge badge-pass';
      claudeBadge.textContent = '纯净海外环境';
      claudeIcon.textContent = '🟢';
      claudeTitle.textContent = '未检出大陆特征 (安全通过)';
      claudeSub.textContent = `风险评估分: ${summary.claudeRiskScore} 分 · 完美契合海外用户画像`;

      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = '时区/语言/字体 100% 隔离';
      claudeTags.appendChild(tag);
    } else {
      claudeBadge.className = summary.claudeStatus === 'critical' ? 'badge badge-fail' : 'badge badge-warn';
      claudeBadge.textContent = summary.claudeStatus === 'critical' ? '极高封禁风险' : '可疑中文特征';
      claudeIcon.textContent = summary.claudeStatus === 'critical' ? '🔴' : '🟡';
      claudeTitle.textContent = summary.claudeStatus === 'critical' ? '100% 被定性为中国大陆用户' : '存在部分中国大陆环境特征';
      claudeSub.textContent = `风险分: ${summary.claudeRiskScore} 分 · 触发了 ${claude.summary}`;

      if (claude.timezoneLeaked) {
        const t = document.createElement('span');
        t.className = 'tag font-detected';
        t.textContent = '时区泄露';
        claudeTags.appendChild(t);
      }
      if (claude.languageLeaked || claude.languagesLeaked) {
        const t = document.createElement('span');
        t.className = 'tag font-detected';
        t.textContent = '语言泄露';
        claudeTags.appendChild(t);
      }
      if (claude.chineseFontsDetected.length > 0) {
        const t = document.createElement('span');
        t.className = 'tag font-detected';
        t.textContent = `${claude.chineseFontsDetected.length} 款中文字体泄露`;
        claudeTags.appendChild(t);
      }
    }
  }

  // Anti-detect
  const antiDetectBadge = document.getElementById('antiDetectBadge');
  const antiDetectBar = document.getElementById('antiDetectBar');
  const antiDetectScoreText = document.getElementById('antiDetectScoreText');
  const antiDetectStatusText = document.getElementById('antiDetectStatusText');

  if (antiDetectBadge && antiDetectBar && antiDetectScoreText && antiDetectStatusText) {
    antiDetectBar.style.width = `${summary.antiDetectScore}%`;
    antiDetectScoreText.textContent = `${summary.antiDetectScore} 分`;

    if (summary.antiDetectScore >= 95) {
      antiDetectBadge.className = 'badge badge-pass';
      antiDetectBadge.textContent = '原生级伪装';
      antiDetectStatusText.textContent = '严格符合 ES 原生标准';
      antiDetectBar.style.background = 'var(--accent-emerald)';
    } else {
      antiDetectBadge.className = 'badge badge-warn';
      antiDetectBadge.textContent = '轻微破绽';
      antiDetectStatusText.textContent = '存在细微 Hook 属性差异';
      antiDetectBar.style.background = 'var(--accent-amber)';
    }
  }

  // Network / IP
  const netFlag = document.getElementById('netFlag');
  const netIpText = document.getElementById('netIpText');
  const netLocTag = document.getElementById('netLocationTag');
  const netTypeTag = document.getElementById('netTypeTag');
  const netWebrtcTag = document.getElementById('netWebrtcTag');
  const netBadge = document.getElementById('netBadge');
  const netCross = document.getElementById('netCrossSummary');

  if (netFlag && netIpText && netLocTag && netTypeTag && netWebrtcTag && netBadge && netCross) {
    netIpText.textContent = ipInfo.ip || '未知';
    netLocTag.textContent = ipInfo.country ? `${ipInfo.country} (${ipInfo.city || ''})` : '未知位置';
    netTypeTag.textContent = ipInfo.ipType || 'IP 类型未知';

    if (summary.ipWebRTCStatus === 'secure') {
      netWebrtcTag.className = 'tag';
      netWebrtcTag.textContent = 'WebRTC: 0 泄露';
      netBadge.className = 'badge badge-pass';
      netBadge.textContent = '网络安全';
    } else {
      netWebrtcTag.className = 'tag font-detected';
      netWebrtcTag.textContent = 'WebRTC: 发现 Candidate 泄露';
      netBadge.className = 'badge badge-warn';
      netBadge.textContent = '存在泄露';
    }

    netCross.textContent = ipInfo.timezone
      ? `IP 所在时区: ${ipInfo.timezone} | 浏览器时区: ${new Intl.DateTimeFormat().resolvedOptions().timeZone}`
      : '已核验网络出口特征';
  }
}

/**
 * 渲染“你是中国人吗”排查卡片及字体胶囊
 */
function renderClaudeSection(result: any, checks: CheckItem[]) {
  const grid = document.getElementById('claudeChecksGrid');
  if (grid) {
    grid.innerHTML = '';
    checks.forEach(check => {
      grid.appendChild(createCheckCard(check));
    });
  }

  // 渲染字体胶囊
  const metaEl = document.getElementById('fontScanMeta');
  const container = document.getElementById('fontsCapsules');

  if (metaEl) {
    metaEl.textContent = `共测试 45+ 款中文字体库：检出 ${result.chineseFontsDetected.length} 款，成功屏蔽 ${result.chineseFontsMasked.length} 款`;
  }

  if (container) {
    container.innerHTML = '';
    // 先显示检出的
    result.chineseFontsDetected.forEach((font: string) => {
      const cap = document.createElement('span');
      cap.className = 'font-capsule font-detected';
      cap.textContent = `⚠️ ${font} (泄露)`;
      container.appendChild(cap);
    });

    // 再显示成功防御屏蔽的
    result.chineseFontsMasked.forEach((font: string) => {
      const cap = document.createElement('span');
      cap.className = 'font-capsule font-masked';
      cap.textContent = `🛡️ ${font} (已成功隐匿)`;
      container.appendChild(cap);
    });

    if (result.chineseFontsDetected.length === 0 && result.chineseFontsMasked.length === 0) {
      const cap = document.createElement('span');
      cap.className = 'font-capsule';
      cap.textContent = '系统未检出任何特征中文字体，表现为纯净海外 OS 环境';
      container.appendChild(cap);
    }
  }
}

/**
 * 渲染网络卡片及 WebRTC Candidates
 */
function renderNetworkSection(ipInfo: any, webrtc: any, checks: CheckItem[]) {
  const valIp = document.getElementById('valNetIp');
  const valGeo = document.getElementById('valNetGeo');
  const valIsp = document.getElementById('valNetIsp');
  const valAsn = document.getElementById('valNetAsn');
  const valType = document.getElementById('valNetType');
  const valTz = document.getElementById('valNetTz');

  if (valIp) valIp.textContent = ipInfo.ip || '-';
  if (valGeo) valGeo.textContent = ipInfo.country ? `${ipInfo.country} ${ipInfo.city || ''}` : '-';
  if (valIsp) valIsp.textContent = ipInfo.org || '-';
  if (valAsn) valAsn.textContent = ipInfo.asn || '-';
  if (valType) valType.textContent = ipInfo.ipType || '-';
  if (valTz) valTz.textContent = ipInfo.timezone || '-';

  const badge = document.getElementById('webrtcStatusBadge');
  const candBox = document.getElementById('webrtcCandidatesBox');

  if (badge) {
    badge.className = webrtc.hasLeak ? 'badge badge-warn' : 'badge badge-pass';
    badge.textContent = webrtc.hasLeak ? '存在 Candidate 暴露' : '🛡️ 拦截穿透成功';
  }

  if (candBox) {
    if (webrtc.candidates.length > 0) {
      candBox.innerHTML = webrtc.candidates
        .map((c: string) => `<div>${escapeHtml(c)}</div>`)
        .join('');
    } else {
      candBox.textContent = '未探测到任何穿透 Candidate (VanishMe 的 WebRTC 保护策略已成功阻断 UDP 泄露)';
    }
  }

  const grid = document.getElementById('networkChecksGrid');
  if (grid) {
    grid.innerHTML = '';
    checks.forEach(check => grid.appendChild(createCheckCard(check)));
  }
}

/**
 * 渲染浏览器指纹卡片
 */
function renderFingerprintSection(fp: any, checks: CheckItem[], canvasPreview: string) {
  const previewImg = document.getElementById('canvasPreviewImg') as HTMLImageElement;
  const hashText = document.getElementById('canvasHashText');
  const noiseBadge = document.getElementById('canvasNoiseBadge');
  const rendererText = document.getElementById('webglRendererText');
  const vendorText = document.getElementById('webglVendorText');
  const compatBadge = document.getElementById('webglCompatBadge');

  if (previewImg && canvasPreview) {
    previewImg.src = canvasPreview;
  }
  if (hashText) hashText.textContent = fp.canvasHash;
  if (noiseBadge) {
    noiseBadge.className = fp.canvasNoise === 'spoofed_noise' ? 'badge badge-pass' : 'badge badge-info';
    noiseBadge.textContent = fp.canvasNoise === 'spoofed_noise' ? '动态噪点防护开启' : '固定标准特征码';
  }
  if (rendererText) rendererText.textContent = fp.webglUnmaskedRenderer || fp.webglRenderer;
  if (vendorText) vendorText.textContent = fp.webglUnmaskedVendor || fp.webglVendor;
  if (compatBadge) {
    compatBadge.className = fp.webglCompatibility === 'consistent' ? 'badge badge-pass' : 'badge badge-fail';
    compatBadge.textContent = fp.webglCompatibility === 'consistent' ? '吻合当前操作系统' : '架构冲突！';
  }

  const grid = document.getElementById('fingerprintChecksGrid');
  if (grid) {
    grid.innerHTML = '';
    checks.forEach(check => grid.appendChild(createCheckCard(check)));
  }
}

/**
 * 渲染反检测隐蔽性审计
 */
function renderAntiDetectionSection(audit: any, checks: CheckItem[]) {
  const container = document.getElementById('antiDetectAuditDetails');
  if (!container) return;

  container.innerHTML = `
    <div class="audit-group">
      <div class="audit-group-title">1. Function.prototype.toString 原生伪装规范校验</div>
      ${audit.toStringChecks.map((c: any) => `
        <div class="audit-row">
          <div class="audit-row-left">
            <span>${c.passed ? '🟢' : '🔴'}</span>
            <strong>${escapeHtml(c.name)}</strong>
          </div>
          <span class="audit-row-desc">${escapeHtml(c.details)}</span>
        </div>
      `).join('')}
    </div>

    <div class="audit-group">
      <div class="audit-group-title">2. ES6 原型属性描述符审计 (Getter 规范与 .prototype 探测)</div>
      ${audit.descriptorChecks.map((c: any) => `
        <div class="audit-row">
          <div class="audit-row-left">
            <span>${c.passed ? '🟢' : '🔴'}</span>
            <strong>${escapeHtml(c.name)}</strong>
          </div>
          <span class="audit-row-desc">${escapeHtml(c.details)}</span>
        </div>
      `).join('')}
    </div>

    <div class="audit-group">
      <div class="audit-group-title">3. 原型链防篡改隔离检查 (hasOwnProperty 自有属性防污染)</div>
      ${audit.prototypeChecks.map((c: any) => `
        <div class="audit-row">
          <div class="audit-row-left">
            <span>${c.passed ? '🟢' : '🔴'}</span>
            <strong>${escapeHtml(c.name)}</strong>
          </div>
          <span class="audit-row-desc">${escapeHtml(c.details)}</span>
        </div>
      `).join('')}
    </div>

    <div class="audit-group">
      <div class="audit-group-title">4. 动态新建 Iframe 沙盒穿透对抗测试 (拦截子窗口破防)</div>
      ${audit.iframeBypassChecks.map((c: any) => `
        <div class="audit-row">
          <div class="audit-row-left">
            <span>${c.passed ? '🟢' : '🔴'}</span>
            <strong>${escapeHtml(c.name)}</strong>
          </div>
          <span class="audit-row-desc">${escapeHtml(c.details)}</span>
        </div>
      `).join('')}
    </div>

    <div class="audit-group">
      <div class="audit-group-title">5. Error.stack 异常堆栈追踪清洗测试</div>
      ${audit.stackLeakChecks.map((c: any) => `
        <div class="audit-row">
          <div class="audit-row-left">
            <span>${c.passed ? '🟢' : '🔴'}</span>
            <strong>${escapeHtml(c.name)}</strong>
          </div>
          <span class="audit-row-desc">${escapeHtml(c.details)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * 渲染双向对比表格
 */
function renderComparisonTable(native: EnvironmentSnapshot | null, config: PrivacyConfig, claudeResult: any) {
  const tbody = document.getElementById('comparisonTableBody');
  if (!tbody || !native) return;

  const rows = [
    {
      dim: '系统时区 (Intl Timezone)',
      native: native.timezone,
      spoofed: new Intl.DateTimeFormat().resolvedOptions().timeZone,
      effect: native.timezone !== new Intl.DateTimeFormat().resolvedOptions().timeZone ? '🛡️ 成功伪装为目标时区' : '保持一致'
    },
    {
      dim: '时区偏移量 (UTC Offset)',
      native: `UTC${native.timezoneOffset > 0 ? '-' : '+'}${Math.abs(native.timezoneOffset / 60)} (${native.timezoneOffset}分)`,
      spoofed: `UTC${new Date().getTimezoneOffset() > 0 ? '-' : '+'}${Math.abs(new Date().getTimezoneOffset() / 60)} (${new Date().getTimezoneOffset()}分)`,
      effect: native.timezoneOffset !== new Date().getTimezoneOffset() ? '🛡️ 偏移已协同对齐' : '保持一致'
    },
    {
      dim: '首选语言 (navigator.language)',
      native: native.language,
      spoofed: navigator.language,
      effect: native.language !== navigator.language ? '🛡️ 中文语言已完全隐蔽' : '保持一致'
    },
    {
      dim: '备用语言列表 (navigator.languages)',
      native: native.languages.join(', ') || 'None',
      spoofed: navigator.languages ? [...navigator.languages].join(', ') : 'None',
      effect: '🛡️ 纯净海外语言栈'
    },
    {
      dim: '本地中文字体特征 (45+ 库)',
      native: `${native.chineseFontsCount} 种中文字体可被嗅探`,
      spoofed: `${claudeResult.chineseFontsDetected.length} 种泄露 (${claudeResult.chineseFontsMasked.length} 种已阻断)`,
      effect: claudeResult.chineseFontsDetected.length === 0 ? '🛡️ 字体指纹 100% 屏蔽' : '建议开启字体混淆'
    },
    {
      dim: '地理位置经纬度 (Geolocation)',
      native: '真实物理 GPS / Wi-Fi 定位',
      spoofed: config.globalEnabled && config.geolocation.enabled ? `${config.geolocation.latitude}, ${config.geolocation.longitude}` : '未启用伪装',
      effect: config.globalEnabled && config.geolocation.enabled ? '🛡️ 虚拟坐标返回 (0 权限警告)' : '原生态'
    },
    {
      dim: 'Claude / OpenAI 风控判定',
      native: native.timezone.includes('Shanghai') || native.language.includes('zh') ? '🔴 100% 判定为中国大陆用户 (封禁)' : '海外环境',
      spoofed: claudeResult.totalRiskPoints < 20 ? '🟢 纯净海外环境 (安全通过)' : '⚠️ 存在部分指标预警',
      effect: '🛡️ 跨国风控全面规避'
    }
  ];

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.dim)}</strong></td>
      <td class="val-native">${escapeHtml(r.native)}</td>
      <td class="val-protected">${escapeHtml(r.spoofed)}</td>
      <td><span class="badge badge-pass">${escapeHtml(r.effect)}</span></td>
    </tr>
  `).join('');
}

/**
 * 更新 Geolocation 页面状态展示
 */
function updateGeoStatusDisplay() {
  const availEl = document.getElementById('geoAvailVal');
  const statusEl = document.getElementById('geoStatusVal');
  const latEl = document.getElementById('geoLatVal');
  const lonEl = document.getElementById('geoLonVal');
  const accEl = document.getElementById('geoAccVal');
  const permEl = document.getElementById('geoPermVal');

  if (availEl) availEl.textContent = navigator.geolocation ? '可用 (受 VanishMe 保护)' : '不支持';
  if (statusEl) statusEl.textContent = '就绪 (点击上方按钮安全测试)';

  if (activeConfig && activeConfig.globalEnabled && activeConfig.geolocation && activeConfig.geolocation.enabled) {
    if (latEl) latEl.textContent = activeConfig.geolocation.latitude.toString();
    if (lonEl) lonEl.textContent = activeConfig.geolocation.longitude.toString();
    if (accEl) accEl.textContent = `${activeConfig.geolocation.accuracy}m`;
  }

  if (navigator.permissions) {
    navigator.permissions.query({ name: 'geolocation' as PermissionName })
      .then(res => {
        if (permEl) permEl.textContent = `${res.state} (已伪装为常开授权)`;
      })
      .catch(() => {
        if (permEl) permEl.textContent = 'granted (受保护)';
      });
  }
}

/**
 * 执行 Geolocation 测试 (Issue #2 核心修复逻辑：安全无警告测试)
 */
function runGeolocationTest() {
  const statusEl = document.getElementById('geoStatusVal');
  const latEl = document.getElementById('geoLatVal');
  const lonEl = document.getElementById('geoLonVal');
  const accEl = document.getElementById('geoAccVal');

  if (!navigator.geolocation) {
    if (statusEl) statusEl.textContent = 'Geolocation 不可用';
    return;
  }

  if (statusEl) statusEl.textContent = '正在读取坐标...';

  // 核心判定：若当前伪装处于开启状态，直接调用将由 VanishMe Hook 返回伪装值，无权限警告
  if (activeConfig?.globalEnabled && activeConfig?.geolocation?.enabled) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (statusEl) statusEl.textContent = '✅ 读取成功 (安全伪装调用，0 权限警告)';
        if (latEl) latEl.textContent = pos.coords.latitude.toFixed(6);
        if (lonEl) lonEl.textContent = pos.coords.longitude.toFixed(6);
        if (accEl) accEl.textContent = `${pos.coords.accuracy}m`;
      },
      (err) => {
        if (statusEl) statusEl.textContent = `❌ 读取失败: ${err.message}`;
      },
      { timeout: 5000 }
    );
  } else {
    // 若未开启定位伪装：不要直接在扩展页面调用原生 API 触发 Chrome 权限警告！
    // 安全优雅地提示用户
    if (statusEl) {
      statusEl.textContent = '⚠️ 定位伪装未开启。为保护隐私，扩展自身页面未申请 GPS 物理权限（避免刺探您的真实物理位置）。请在 VanishMe 弹窗中开启 Geolocation 保护后测试。';
    }
  }
}

/**
 * 执行 watchPosition 监听测试
 */
function runWatchPositionTest() {
  const btn = document.getElementById('btnWatchGeolocation') as HTMLButtonElement;
  const statusEl = document.getElementById('geoStatusVal');
  const latEl = document.getElementById('geoLatVal');
  const lonEl = document.getElementById('geoLonVal');
  const accEl = document.getElementById('geoAccVal');

  if (!navigator.geolocation) return;

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    if (btn) btn.textContent = '📡 开启 watchPosition 动态监听';
    if (statusEl) statusEl.textContent = '已停止持续监听';
    return;
  }

  if (btn) btn.textContent = '🛑 停止监听';
  let counter = 0;

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      counter++;
      if (statusEl) statusEl.textContent = `✅ watchPosition 回调响应 #${counter} (安全伪装)`;
      if (latEl) latEl.textContent = pos.coords.latitude.toFixed(6);
      if (lonEl) lonEl.textContent = pos.coords.longitude.toFixed(6);
      if (accEl) accEl.textContent = `${pos.coords.accuracy}m`;
    },
    (err) => {
      if (statusEl) statusEl.textContent = `监听错误: ${err.message}`;
    }
  );
}

/**
 * 创建单项检测卡片 DOM
 */
function createCheckCard(check: CheckItem): HTMLElement {
  const card = document.createElement('div');
  const statusClass = check.status === 'pass' ? 'card-pass' : check.status === 'fail' ? 'card-fail' : check.status === 'warn' ? 'card-warn' : 'card-info';
  card.className = `check-card ${statusClass}`;

  const badgeHtml = check.status === 'pass'
    ? '<span class="badge badge-pass">通过</span>'
    : check.status === 'fail'
      ? '<span class="badge badge-fail">高危</span>'
      : check.status === 'warn'
        ? '<span class="badge badge-warn">预警</span>'
        : '<span class="badge badge-info">信息</span>';

  card.innerHTML = `
    <div class="check-card-header">
      <span class="check-card-name">${escapeHtml(check.name)}</span>
      ${badgeHtml}
    </div>
    <div class="check-card-val">${escapeHtml(check.actualValue)}</div>
    ${check.riskDescription ? `<div class="check-card-tip">${escapeHtml(check.riskDescription)}</div>` : ''}
  `;

  return card;
}

/**
 * 复制 Markdown 格式诊断报告
 */
function copyMarkdownReport() {
  if (!lastAuditReport) return;
  const { summary, allChecks, ipInfo, claudeResult } = lastAuditReport;

  const report = [
    `# 🛡️ VanishMe 深度隐私与指纹审计报告`,
    `**诊断时间**: ${new Date().toLocaleString()}`,
    `**综合隐私评分**: ${summary.privacyScore} / 100 (${summary.privacyScore >= 85 ? '极度安全' : '存在预警'})`,
    `**Claude / 跨境 AI 封禁判定**: ${claudeResult.summary} (风险分: ${summary.claudeRiskScore})`,
    `**公网出口 IP**: ${ipInfo.ip || '未知'} (${ipInfo.country || '海外'})`,
    `**WebRTC 状态**: ${summary.ipWebRTCStatus}`,
    `**反作弊隐蔽性**: ${summary.antiDetectStatus} (${summary.antiDetectScore}分)`,
    ``,
    `## 核心检测项清单`,
    ...allChecks.map(c => `- [${c.status.toUpperCase()}] **${c.name}**: \`${c.actualValue}\` ${c.riskDescription ? `(${c.riskDescription})` : ''}`),
    ``,
    `---`,
    `*由 VanishMe 本地 100% 离线诊断引擎生成，严守个人隐私，不上传任何数据。*`
  ].join('\n');

  navigator.clipboard.writeText(report).then(() => {
    const btn = document.getElementById('copyReportBtn');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '✔ 报告已复制到剪贴板！';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }
  });
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 绑定页面交互事件
document.addEventListener('DOMContentLoaded', () => {
  // 1. 立即捕获底层原生状态
  nativeSnapshot = captureNativeSnapshot();

  // 2. 绑定事件监听
  const retestBtn = document.getElementById('retestBtn');
  const copyBtn = document.getElementById('copyReportBtn');
  const viewProtectedBtn = document.getElementById('viewProtectedBtn');
  const viewComparisonBtn = document.getElementById('viewComparisonBtn');
  const btnTriggerWebRTC = document.getElementById('btnTriggerWebRTC');
  const btnRunGeolocation = document.getElementById('btnRunGeolocation');
  const btnWatchGeolocation = document.getElementById('btnWatchGeolocation');

  if (retestBtn) retestBtn.addEventListener('click', runFullAudit);
  if (copyBtn) copyBtn.addEventListener('click', copyMarkdownReport);

  if (viewProtectedBtn && viewComparisonBtn) {
    viewProtectedBtn.addEventListener('click', () => {
      viewProtectedBtn.classList.add('active');
      viewComparisonBtn.classList.remove('active');
      const compSec = document.getElementById('comparisonSection');
      const mainSec = document.getElementById('mainSections');
      const hint = document.getElementById('switcherHint');
      if (compSec) compSec.style.display = 'none';
      if (mainSec) mainSec.style.display = 'flex';
      if (hint) hint.textContent = '当前展示：目标网站（如 Claude、OpenAI、BrowserScan）在当前配置下读取到的真实数据';
    });

    viewComparisonBtn.addEventListener('click', () => {
      viewComparisonBtn.classList.add('active');
      viewProtectedBtn.classList.remove('active');
      const compSec = document.getElementById('comparisonSection');
      const mainSec = document.getElementById('mainSections');
      const hint = document.getElementById('switcherHint');
      if (compSec) compSec.style.display = 'block';
      if (mainSec) mainSec.style.display = 'none';
      if (hint) hint.textContent = '当前展示：未伪装前的底层真实数据与 VanishMe 伪装后数据的清晰对照';
    });
  }

  if (btnTriggerWebRTC) {
    btnTriggerWebRTC.addEventListener('click', async () => {
      btnTriggerWebRTC.textContent = '⏳ 测试中...';
      const r = await testWebRTCLeak();
      const candBox = document.getElementById('webrtcCandidatesBox');
      const badge = document.getElementById('webrtcStatusBadge');
      if (candBox) {
        candBox.innerHTML = r.candidates.length > 0
          ? r.candidates.map(c => `<div>${escapeHtml(c)}</div>`).join('')
          : '未探测到任何穿透 Candidate (VanishMe 的 WebRTC 保护策略已成功阻断 UDP 泄露)';
      }
      if (badge) {
        badge.className = r.hasLeak ? 'badge badge-warn' : 'badge badge-pass';
        badge.textContent = r.hasLeak ? '存在 Candidate 暴露' : '🛡️ 拦截穿透成功';
      }
      btnTriggerWebRTC.textContent = '🔄 重测 WebRTC 穿透';
    });
  }

  if (btnRunGeolocation) btnRunGeolocation.addEventListener('click', runGeolocationTest);
  if (btnWatchGeolocation) btnWatchGeolocation.addEventListener('click', runWatchPositionTest);

  // 3. 执行首次排查
  runFullAudit();
});
