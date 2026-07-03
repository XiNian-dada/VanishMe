import type { CanvasConfig } from '../shared/types';

export function setupCanvasSpoofing(config: CanvasConfig) {
  if (!config.enabled || !config.spoofFonts) {
    return;
  }

  // 保存原始方法
  const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
  const originalGetPropertyDescriptor = Object.getOwnPropertyDescriptor;

  // 目标：让字体检测失败，返回一致的宽度
  // 检测原理：切换字体前后宽度差异 > 0.5 就认为字体存在
  // 我们的策略：无论什么字体，都返回相同的宽度

  // 劫持 measureText
  const measureTextProxy = new Proxy(originalMeasureText, {
    apply(target, thisArg, args) {
      const result = Reflect.apply(target, thisArg, args);

      // 如果正在检测中文字体，返回统一的宽度（让差异 < 0.5）
      if (thisArg && thisArg.font && config.targetFonts.length > 0) {
        const font = thisArg.font.toLowerCase();

        // 检查是否在测试目标字体
        for (const targetFont of config.targetFonts) {
          const targetFontLower = targetFont.toLowerCase();
          if (font.includes(targetFontLower)) {
            // 返回固定宽度，让检测失败
            // 使用 fallback 字体（monospace/sans-serif/serif）的宽度
            const baseFontMatch = font.match(/(monospace|sans-serif|serif)/);
            if (baseFontMatch) {
              // 重新测量 fallback 字体的宽度
              const baseFont = font.replace(`"${targetFont}",`, '').trim();
              thisArg.font = baseFont;
              const baseResult = Reflect.apply(target, thisArg, args);

              // 恢复字体
              thisArg.font = font;

              // 返回 fallback 字体的宽度（让差异 = 0）
              return baseResult;
            }
          }
        }
      }

      return result;
    }
  });

  // 应用 Proxy
  CanvasRenderingContext2D.prototype.measureText = measureTextProxy;

  // 隐藏修改痕迹 - toString
  Object.defineProperty(measureTextProxy, 'toString', {
    value: function() {
      return 'function measureText() { [native code] }';
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });

  // 隐藏修改痕迹 - getOwnPropertyDescriptor
  Object.getOwnPropertyDescriptor = new Proxy(originalGetPropertyDescriptor, {
    apply(target, thisArg, args) {
      const [obj, prop] = args;
      if (obj === CanvasRenderingContext2D.prototype && prop === 'measureText') {
        return {
          value: originalMeasureText,
          writable: true,
          enumerable: true,
          configurable: true,
        };
      }
      return Reflect.apply(target, thisArg, args);
    }
  });

  console.log('[VanishMe] Canvas font anti-detection enabled, hiding fonts:', config.targetFonts);
}
