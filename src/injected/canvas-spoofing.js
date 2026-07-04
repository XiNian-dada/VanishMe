export function setupCanvasSpoofing(config) {
    if (!config.enabled || !config.spoofFonts) {
        return;
    }
    // 保存原始方法
    const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
    const originalGetPropertyDescriptor = Object.getOwnPropertyDescriptor;
    // 劫持 measureText
    const measureTextProxy = new Proxy(originalMeasureText, {
        apply(target, thisArg, args) {
            if (thisArg && thisArg.font && config.targetFonts.length > 0) {
                const font = thisArg.font.toLowerCase();
                // 检查是否包含目标中文字体
                for (const targetFont of config.targetFonts) {
                    const targetFontLower = targetFont.toLowerCase();
                    if (font.includes(`"${targetFontLower}"`) || font.includes(`'${targetFontLower}'`)) {
                        // 检测到目标字体，移除它，只用 fallback 字体测量
                        // 例如：'72px "Microsoft YaHei", sans-serif' -> '72px sans-serif'
                        const fallbackFont = font
                            .replace(new RegExp(`["']${targetFontLower}["']\\s*,\\s*`, 'gi'), '')
                            .replace(new RegExp(`["']${targetFontLower}["']`, 'gi'), '');
                        // 临时改变字体为 fallback
                        const originalFont = thisArg.font;
                        thisArg.font = fallbackFont;
                        // 用 fallback 字体测量
                        const result = Reflect.apply(target, thisArg, args);
                        // 恢复原字体
                        thisArg.font = originalFont;
                        return result;
                    }
                }
            }
            // 正常调用
            return Reflect.apply(target, thisArg, args);
        }
    });
    // 应用 Proxy
    CanvasRenderingContext2D.prototype.measureText = measureTextProxy;
    // 隐藏修改痕迹 - toString
    Object.defineProperty(measureTextProxy, 'toString', {
        value: function () {
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
