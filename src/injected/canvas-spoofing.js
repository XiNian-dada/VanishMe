export function setupCanvasSpoofing(config) {
    if (!config.enabled || !config.spoofFonts) {
        return;
    }
    // 保存原始方法
    const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
    const originalGetPropertyDescriptor = Object.getOwnPropertyDescriptor;
    // 字体宽度映射表（不同字体的相对宽度比例）
    // 以 Arial 为基准 1.0
    const fontWidthRatios = {
        // 中文字体 - 宽度较大
        'Microsoft YaHei': 1.15,
        'SimSun': 1.12,
        'SimHei': 1.14,
        'STHeiti': 1.13,
        'STSong': 1.11,
        'PingFang SC': 1.16,
        'Hiragino Sans GB': 1.15,
        'Source Han Sans CN': 1.15,
        'Noto Sans CJK SC': 1.15,
        // 西文字体
        'Arial': 1.0,
        'Helvetica': 1.0,
        'Times New Roman': 0.95,
        'Courier New': 1.2,
    };
    // 劫持 measureText
    const measureTextProxy = new Proxy(originalMeasureText, {
        apply(target, thisArg, args) {
            const result = Reflect.apply(target, thisArg, args);
            // 如果配置了目标字体，调整宽度
            if (config.targetFonts.length > 0 && thisArg && thisArg.font) {
                const font = thisArg.font.toLowerCase();
                // 检查是否使用了目标字体
                for (const targetFont of config.targetFonts) {
                    const targetFontLower = targetFont.toLowerCase();
                    if (font.includes(targetFontLower)) {
                        const ratio = fontWidthRatios[targetFont] || 1.15;
                        // 创建一个新的 TextMetrics 对象
                        const modifiedMetrics = {
                            width: result.width * ratio,
                            actualBoundingBoxLeft: result.actualBoundingBoxLeft,
                            actualBoundingBoxRight: result.actualBoundingBoxRight * ratio,
                            fontBoundingBoxAscent: result.fontBoundingBoxAscent,
                            fontBoundingBoxDescent: result.fontBoundingBoxDescent,
                            actualBoundingBoxAscent: result.actualBoundingBoxAscent,
                            actualBoundingBoxDescent: result.actualBoundingBoxDescent,
                            emHeightAscent: result.emHeightAscent,
                            emHeightDescent: result.emHeightDescent,
                            hangingBaseline: result.hangingBaseline,
                            alphabeticBaseline: result.alphabeticBaseline,
                            ideographicBaseline: result.ideographicBaseline,
                        };
                        return modifiedMetrics;
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
    console.log('[VanishMe] Canvas font spoofing enabled with fonts:', config.targetFonts);
}
