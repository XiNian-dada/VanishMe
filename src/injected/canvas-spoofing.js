const FONT_SIZE_PATTERN = /(?:^|\s)(?:xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|larger|smaller|(?:\d*\.)?\d+(?:px|pt|pc|in|cm|mm|q|em|rem|ex|ch|lh|rlh|vw|vh|vmin|vmax|%))(?:\/(?:normal|[\d.]+(?:px|pt|pc|in|cm|mm|q|em|rem|ex|ch|lh|rlh|vw|vh|vmin|vmax|%)?))?(?=\s|$)/i;
function normalizeFontFamily(family) {
    const trimmed = family.trim();
    const unquoted = trimmed.length >= 2 &&
        ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'")))
        ? trimmed.slice(1, -1)
        : trimmed;
    return unquoted.replace(/\s+/g, ' ').toLowerCase();
}
function fontFamilyKey(family) {
    return normalizeFontFamily(family).replace(/\s+/g, '');
}
function splitFontFamilies(familyList) {
    const families = [];
    let current = '';
    let quote = null;
    let escaped = false;
    for (const char of familyList) {
        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }
        if (char === '\\') {
            current += char;
            escaped = true;
            continue;
        }
        if ((char === '"' || char === "'") && !quote) {
            quote = char;
            current += char;
            continue;
        }
        if (quote && char === quote) {
            quote = null;
            current += char;
            continue;
        }
        if (char === ',' && !quote) {
            const family = current.trim();
            if (family) {
                families.push(family);
            }
            current = '';
            continue;
        }
        current += char;
    }
    const family = current.trim();
    if (family) {
        families.push(family);
    }
    return families;
}
function getFallbackFont(font, targetFontKeys) {
    const sizeMatch = font.match(FONT_SIZE_PATTERN);
    if (!sizeMatch || sizeMatch.index === undefined) {
        return null;
    }
    const familyStart = sizeMatch.index + sizeMatch[0].length;
    const prefix = font.slice(0, familyStart).trim();
    const families = splitFontFamilies(font.slice(familyStart).trim());
    if (families.length === 0) {
        return null;
    }
    const fallbackFamilies = families.filter((family) => !targetFontKeys.has(fontFamilyKey(family)));
    if (fallbackFamilies.length === families.length) {
        return null;
    }
    return `${prefix} ${fallbackFamilies.length > 0 ? fallbackFamilies.join(', ') : 'monospace'}`;
}
export function setupCanvasSpoofing(config) {
    if (!config.enabled || !config.spoofFonts) {
        return;
    }
    // 保存原始方法
    const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const targetFontKeys = new Set(config.targetFonts.map(fontFamilyKey));
    function measureTextWithFontFallback(ctx, text) {
        if (ctx.font && targetFontKeys.size > 0) {
            const fallbackFont = getFallbackFont(ctx.font, targetFontKeys);
            if (fallbackFont) {
                const originalFont = ctx.font;
                ctx.font = fallbackFont;
                try {
                    return originalMeasureText.call(ctx, text);
                }
                finally {
                    ctx.font = originalFont;
                }
            }
        }
        return originalMeasureText.call(ctx, text);
    }
    // 创建直接函数替换（不用 Proxy）
    function createMeasureTextInterceptor() {
        return function measureText(text) {
            return measureTextWithFontFallback(this, text);
        };
    }
    // 劫持 HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = new Proxy(originalGetContext, {
        apply(target, thisArg, args) {
            const context = Reflect.apply(target, thisArg, args);
            // 如果是 2d context，劫持它的 measureText
            if (context && args[0] === '2d' && 'measureText' in context) {
                const ctx = context;
                const measureTextWrapper = createMeasureTextInterceptor();
                // 直接替换实例的 measureText
                Object.defineProperty(ctx, 'measureText', {
                    value: measureTextWrapper,
                    writable: true,
                    enumerable: false,
                    configurable: true
                });
            }
            return context;
        }
    });
    // 同时劫持原型链上的 measureText（双保险）
    const prototypeMeasureText = function (text) {
        return measureTextWithFontFallback(this, text);
    };
    CanvasRenderingContext2D.prototype.measureText = prototypeMeasureText;
    // 隐藏修改痕迹 - toString
    Object.defineProperty(prototypeMeasureText, 'toString', {
        value: function () {
            return 'function measureText() { [native code] }';
        },
        writable: true,
        configurable: true,
        enumerable: false,
    });
    // 劫持 document.fonts.check() API
    if (document.fonts && document.fonts.check) {
        const originalCheck = document.fonts.check.bind(document.fonts);
        document.fonts.check = function (font, text) {
            if (font && typeof font === 'string') {
                const parsedFallback = getFallbackFont(font, targetFontKeys);
                if (parsedFallback) {
                    return false; // 返回 false 表示字体不存在
                }
            }
            return originalCheck(font, text);
        };
    }
    // 劫持 FontFaceSet 的迭代器 - 更底层的字体检测
    if (typeof FontFaceSet !== 'undefined' && document.fonts) {
        const originalForEach = FontFaceSet.prototype.forEach;
        if (originalForEach) {
            FontFaceSet.prototype.forEach = new Proxy(originalForEach, {
                apply(target, thisArg, args) {
                    // 过滤掉目标字体
                    const callback = args[0];
                    if (typeof callback === 'function') {
                        const wrappedCallback = function (fontFace, ...rest) {
                            if (fontFace && fontFace.family) {
                                if (targetFontKeys.has(fontFamilyKey(fontFace.family))) {
                                    return; // 跳过这个字体
                                }
                            }
                            return callback(fontFace, ...rest);
                        };
                        args[0] = wrappedCallback;
                    }
                    return Reflect.apply(target, thisArg, args);
                }
            });
        }
    }
}
