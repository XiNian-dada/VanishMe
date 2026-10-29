import type { CheckItem, FingerprintResult } from './types';

/**
 * 快速 32 位 FNV-1a 哈希算法
 */
export function hashString(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * BrowserScan 规范：生成 Canvas 2D 指纹与噪点稳定性检测
 */
export function getCanvasFingerprint(): {
  hash: string;
  dataUrl: string;
  noiseStatus: 'stable' | 'spoofed_noise' | 'unsupported';
} {
  try {
    const render = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 60;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // 渐变背景
      const grad = ctx.createLinearGradient(0, 0, 240, 60);
      grad.addColorStop(0, '#ff6b6b');
      grad.addColorStop(0.5, '#4ecdc4');
      grad.addColorStop(1, '#45b7d1');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 240, 60);

      // 复杂曲线与透明度
      ctx.beginPath();
      ctx.arc(40, 30, 22, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();

      // 文字与 Emoji 混排 (测试不同字体渲染引擎)
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillStyle = '#0f2027';
      ctx.fillText('VanishMe BrowserScan 🛡️', 12, 10);

      ctx.font = '13px monospace';
      ctx.fillStyle = '#2c3e50';
      ctx.fillText('C# ~!@#$%^&*()_+', 12, 32);

      return canvas;
    };

    const c1 = render();
    if (!c1) {
      return { hash: 'unsupported', dataUrl: '', noiseStatus: 'unsupported' };
    }

    const d1 = c1.toDataURL();
    const h1 = hashString(d1);

    // 渲染第二次检测是否被注入了动态噪点 (Noise Spoofing)
    const c2 = render();
    const d2 = c2 ? c2.toDataURL() : '';
    const h2 = d2 ? hashString(d2) : '';

    const noiseStatus = h1 !== h2 ? 'spoofed_noise' : 'stable';

    return {
      hash: h1,
      dataUrl: d1,
      noiseStatus
    };
  } catch {
    return { hash: 'error', dataUrl: '', noiseStatus: 'unsupported' };
  }
}

/**
 * BrowserScan 规范：获取 WebGL 硬件指纹及底层真实显卡
 */
export function getWebGLFingerprint(): {
  vendor: string;
  renderer: string;
  unmaskedVendor: string;
  unmaskedRenderer: string;
  compatibility: 'consistent' | 'mismatch' | 'unsupported';
  extensionsCount: number;
} {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext);

    if (!gl) {
      return {
        vendor: 'N/A',
        renderer: 'N/A',
        unmaskedVendor: 'N/A',
        unmaskedRenderer: 'N/A',
        compatibility: 'unsupported',
        extensionsCount: 0
      };
    }

    const vendor = gl.getParameter(gl.VENDOR) || '';
    const renderer = gl.getParameter(gl.RENDERER) || '';
    let unmaskedVendor = 'N/A';
    let unmaskedRenderer = 'N/A';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
      unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    }

    const exts = gl.getSupportedExtensions() || [];

    // 检查显卡与操作系统 UA 一致性
    const platform = (navigator.platform || '').toLowerCase();
    const isMacPlatform = platform.includes('mac');
    const isWindowsPlatform = platform.includes('win');

    const rendererLower = (unmaskedRenderer || renderer).toLowerCase();
    let compatibility: 'consistent' | 'mismatch' | 'unsupported' = 'consistent';

    // 如果声明是 Mac，但底层显卡是 Direct3D 或 D3D11 -> 致命矛盾
    if (isMacPlatform && (rendererLower.includes('direct3d') || rendererLower.includes('d3d11'))) {
      compatibility = 'mismatch';
    }
    // 如果声明是 Windows，但底层显卡是 Apple M1/Metal -> 矛盾
    if (isWindowsPlatform && (rendererLower.includes('apple') || rendererLower.includes('metal'))) {
      compatibility = 'mismatch';
    }

    return {
      vendor,
      renderer,
      unmaskedVendor,
      unmaskedRenderer,
      compatibility,
      extensionsCount: exts.length
    };
  } catch {
    return {
      vendor: 'Error',
      renderer: 'Error',
      unmaskedVendor: 'Error',
      unmaskedRenderer: 'Error',
      compatibility: 'unsupported',
      extensionsCount: 0
    };
  }
}

/**
 * BrowserScan 规范：获取 AudioContext 声卡处理指纹
 */
export async function getAudioFingerprint(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const AudioCtx =
        window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      if (!AudioCtx) {
        resolve('Unsupported');
        return;
      }

      const context = new AudioCtx(1, 5000, 44100);
      const oscillator = context.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, context.currentTime);

      const compressor = context.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-50, context.currentTime);
      compressor.knee.setValueAtTime(40, context.currentTime);
      compressor.ratio.setValueAtTime(12, context.currentTime);
      compressor.attack.setValueAtTime(0, context.currentTime);
      compressor.release.setValueAtTime(0.25, context.currentTime);

      oscillator.connect(compressor);
      compressor.connect(context.destination);
      oscillator.start(0);

      context.oncomplete = (event) => {
        const samples = event.renderedBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < samples.length; i += 50) {
          sum += Math.abs(samples[i]);
        }
        resolve(hashString(sum.toString()));
      };

      context.startRendering().catch(() => resolve('Error'));
    } catch {
      resolve('Error');
    }
  });
}

/**
 * 完整收集浏览器指纹信息并输出审计结果
 */
export async function auditBrowserFingerprint(
  targetWin: Window = window
): Promise<{
  fingerprint: FingerprintResult;
  checks: CheckItem[];
  canvasPreview: string;
}> {
  const checks: CheckItem[] = [];

  // 1. Canvas 指纹
  const canvasRes = getCanvasFingerprint();
  checks.push({
    id: 'fp-canvas',
    name: 'Canvas 2D 绘图指纹哈希',
    category: 'fingerprint',
    status: canvasRes.noiseStatus === 'spoofed_noise' ? 'pass' : 'info',
    actualValue: `哈希: ${canvasRes.hash} (${canvasRes.noiseStatus === 'spoofed_noise' ? '已注入动态噪点' : '固定特征码'})`,
    expectedValue: '独立随机噪点或干净特征',
    riskDescription: 'Canvas 被用于生成跨站跟踪唯一设备标识码'
  });

  // 2. WebGL 硬件与显卡一致性
  const webglRes = getWebGLFingerprint();
  if (webglRes.compatibility === 'mismatch') {
    checks.push({
      id: 'fp-webgl',
      name: 'WebGL 渲染器与操作系统一致性',
      category: 'fingerprint',
      status: 'fail',
      actualValue: `Unmasked Renderer: ${webglRes.unmaskedRenderer} (与系统 ${targetWin.navigator.platform} 冲突)`,
      expectedValue: '显卡驱动架构需与当前 OS 声明完全相符',
      riskDescription: '操作系统与 WebGL 底层显卡渲染器发生严重架构矛盾！高端反爬一秒识别指纹篡改！'
    });
  } else {
    checks.push({
      id: 'fp-webgl',
      name: 'WebGL 显卡渲染器 (GPU Vendor / Renderer)',
      category: 'fingerprint',
      status: 'pass',
      actualValue: `${webglRes.unmaskedRenderer || webglRes.renderer || 'N/A'} [${webglRes.unmaskedVendor || webglRes.vendor}]`,
      expectedValue: '与系统相匹配的 GPU 驱动',
      riskDescription: 'WebGL 显卡渲染器特征正常'
    });
  }

  // 3. AudioContext 音频指纹
  const audioHash = await getAudioFingerprint();
  checks.push({
    id: 'fp-audio',
    name: 'AudioContext 音频压缩动力学指纹',
    category: 'fingerprint',
    status: 'info',
    actualValue: `音频哈希: ${audioHash}`,
    expectedValue: '有效声卡 DSP 特征',
    riskDescription: '音频指纹用于辅助识别浏览器硬件配置'
  });

  // 4. 屏幕与视口指标
  const screenW = targetWin.screen.width;
  const screenH = targetWin.screen.height;
  const availW = targetWin.screen.availWidth;
  const availH = targetWin.screen.availHeight;
  const dpr = targetWin.devicePixelRatio;
  const colorDepth = targetWin.screen.colorDepth;

  const isScreenAbnormal = availW > screenW || availH > screenH || screenW === 0;
  checks.push({
    id: 'fp-screen',
    name: '屏幕分辨率与工作区维度 (Screen / DPR)',
    category: 'fingerprint',
    status: isScreenAbnormal ? 'fail' : 'pass',
    actualValue: `${screenW}×${screenH} (可用: ${availW}×${availH}, DPR: ${dpr}, 色深: ${colorDepth}bit)`,
    expectedValue: '真实视口与屏幕比例',
    riskDescription: isScreenAbnormal
      ? '屏幕参数出现逻辑错误（可用尺寸大于屏幕总尺寸），通常由劣质指纹修改器导致'
      : '屏幕参数符合工业标准'
  });

  // 5. 硬件配置 (CPU 核心数与内存)
  const nav = targetWin.navigator as any;
  const cores = nav.hardwareConcurrency || 'N/A';
  const memory = nav.deviceMemory ? `${nav.deviceMemory} GB` : 'N/A';
  const touch = nav.maxTouchPoints || 0;

  checks.push({
    id: 'fp-hardware',
    name: '硬件拓扑 (CPU 核心 / 内存 / 触控)',
    category: 'fingerprint',
    status: 'pass',
    actualValue: `CPU: ${cores} 核, 内存: ${memory}, 触控点: ${touch}`,
    expectedValue: '合理主机硬件拓扑',
    riskDescription: '硬件并发数与内存正常'
  });

  // 6. Client Hints 与 UA 协同
  let clientHintsMatch = true;
  if (nav.userAgentData) {
    const brands = (nav.userAgentData.brands || []).map((b: any) => b.brand).join(', ');
    const platform = nav.userAgentData.platform || '';
    const ua = nav.userAgent || '';

    if (platform && !ua.includes(platform) && platform !== 'macOS') {
      clientHintsMatch = false;
    }

    checks.push({
      id: 'fp-ch',
      name: 'User-Agent Client Hints (高熵提示)',
      category: 'fingerprint',
      status: clientHintsMatch ? 'pass' : 'warn',
      actualValue: `Brands: [${brands}], Platform: ${platform}`,
      expectedValue: '与 User-Agent 字符串保持严格对应',
      riskDescription: clientHintsMatch
        ? 'Client Hints 与 User-Agent 体系协调一致'
        : 'Client Hints 平台与 User-Agent 存在细微偏差'
    });
  } else {
    checks.push({
      id: 'fp-ch',
      name: 'User-Agent Client Hints',
      category: 'fingerprint',
      status: 'info',
      actualValue: '浏览器未暴露 userAgentData API',
      expectedValue: '标准 Client Hints',
      riskDescription: '客户端未启用高熵 Client Hints'
    });
  }

  // 7. 自动化与 Bot 标记
  const isWebdriver = Boolean(nav.webdriver);
  checks.push({
    id: 'fp-webdriver',
    name: '自动化探针 (navigator.webdriver / Bot)',
    category: 'fingerprint',
    status: isWebdriver ? 'fail' : 'pass',
    actualValue: isWebdriver ? '⚠️ true (被标记为自动化程序/爬虫)' : 'false (正常人类浏览器)',
    expectedValue: 'false',
    riskDescription: isWebdriver
      ? 'webdriver 为 true，网站会直接拒绝提供服务'
      : '无自动化程序标记'
  });

  const fingerprint: FingerprintResult = {
    canvasHash: canvasRes.hash,
    canvasNoise: canvasRes.noiseStatus,
    webglVendor: webglRes.vendor,
    webglRenderer: webglRes.renderer,
    webglUnmaskedVendor: webglRes.unmaskedVendor,
    webglUnmaskedRenderer: webglRes.unmaskedRenderer,
    webglCompatibility: webglRes.compatibility,
    audioHash,
    hardwareConcurrency: cores,
    deviceMemory: memory,
    maxTouchPoints: touch,
    screenResolution: `${screenW}×${screenH}`,
    availResolution: `${availW}×${availH}`,
    colorDepth,
    pixelRatio: dpr,
    webdriver: isWebdriver,
    clientHintsMatch,
    platform: nav.platform || 'N/A',
    userAgent: nav.userAgent || 'N/A'
  };

  return {
    fingerprint,
    checks,
    canvasPreview: canvasRes.dataUrl
  };
}
