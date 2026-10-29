import type { AntiDetectAuditResult, CheckItem } from './types';

/**
 * 极高精度反作弊与 Hook 隐蔽性深度审计 (CreepJS / DataDome 级别检测)
 * “比商业检测网站更严格”的核心审计引擎
 */
export async function auditAntiDetection(
  targetWin: any = window
): Promise<{
  audit: AntiDetectAuditResult;
  checks: CheckItem[];
}> {
  const checks: CheckItem[] = [];
  let score = 100;

  const toStringChecks: { name: string; passed: boolean; details: string }[] = [];
  const descriptorChecks: { name: string; passed: boolean; details: string }[] = [];
  const prototypeChecks: { name: string; passed: boolean; details: string }[] = [];
  const iframeBypassChecks: { name: string; passed: boolean; details: string }[] = [];
  const stackLeakChecks: { name: string; passed: boolean; details: string }[] = [];

  // =========================================================================
  // 1. Function.prototype.toString 原生伪装与规范符合性检验
  // =========================================================================
  const testNativeToString = (fn: any, expectedName: string, label: string) => {
    if (!fn) {
      toStringChecks.push({ name: label, passed: false, details: '函数不存在或未定义' });
      return;
    }

    try {
      // a. 直接调用 .toString()
      const str1 = fn.toString();
      const expectedStr = `function ${expectedName}() { [native code] }`;
      const pass1 = str1 === expectedStr;

      // b. 使用 Function.prototype.toString.call(fn)
      const str2 = Function.prototype.toString.call(fn);
      const pass2 = str2 === expectedStr;

      // c. 函数名与参数长度
      const passName = fn.name === expectedName;

      // d. 原生函数绝非构造函数：new 调用必须严格抛出 TypeError
      let notAConstructor = false;
      try {
        new (fn as any)();
      } catch (e) {
        notAConstructor = e instanceof TypeError;
      }

      // e. 原生函数没有 .prototype 属性
      const noPrototypeProp = !('prototype' in fn);

      // f. 函数的 toString 方法严格继承自 Function.prototype.toString，绝无自身私有 toString
      const inheritsToString = fn.toString === Function.prototype.toString;
      const noOwnToString = !Object.prototype.hasOwnProperty.call(fn, 'toString');

      const allPass = pass1 && pass2 && passName && notAConstructor && noPrototypeProp && inheritsToString && noOwnToString;
      if (!allPass) {
        score -= 10;
      }

      toStringChecks.push({
        name: label,
        passed: allPass,
        details: allPass
          ? '严格通过：精确输出 [native code]，非构造函数 (TypeError)，继承自 Function.prototype.toString，无 .prototype 破绽'
          : `异常: toString="${str1}", notConstructor=${notAConstructor}, noProto=${noPrototypeProp}, inheritsToString=${inheritsToString}, noOwnToString=${noOwnToString}`
      });
    } catch (e: any) {
      score -= 15;
      toStringChecks.push({ name: label, passed: false, details: `执行抛出异常: ${e?.message}` });
    }
  };

  testNativeToString(
    targetWin.navigator?.geolocation?.getCurrentPosition,
    'getCurrentPosition',
    'navigator.geolocation.getCurrentPosition'
  );
  testNativeToString(
    targetWin.Date?.prototype?.getTimezoneOffset,
    'getTimezoneOffset',
    'Date.prototype.getTimezoneOffset'
  );
  testNativeToString(
    targetWin.Date?.prototype?.toString,
    'toString',
    'Date.prototype.toString'
  );

  // d. 测试 Function.prototype.toString 对非函数调用是否遵循 ES 规范抛出 TypeError
  let toStringThrowsOnObject = false;
  try {
    Function.prototype.toString.call({} as any);
  } catch (e) {
    toStringThrowsOnObject = e instanceof TypeError;
  }
  if (!toStringThrowsOnObject) {
    score -= 10;
  }
  toStringChecks.push({
    name: 'Function.prototype.toString 异常规范边界 (TypeError)',
    passed: toStringThrowsOnObject,
    details: toStringThrowsOnObject
      ? '遵循 ES 规范：对非函数对象调用精确抛出 TypeError'
      : '不合规：未能正确抛出 TypeError，易被反爬探针利用'
  });

  // e. 测试 Function.prototype.toString 本身不可被作为构造函数 (Non-constructor)
  let toStringNotConstructor = false;
  try {
    new (Function.prototype.toString as any)();
  } catch (e) {
    toStringNotConstructor = e instanceof TypeError;
  }
  if (!toStringNotConstructor) {
    score -= 10;
  }
  toStringChecks.push({
    name: 'Function.prototype.toString 构造器屏蔽测试',
    passed: toStringNotConstructor,
    details: toStringNotConstructor
      ? '遵循规范：Function.prototype.toString 不可作为构造函数调用 (new 抛出 TypeError)'
      : '不合规：Function.prototype.toString 被作为普通函数构造'
  });

  checks.push({
    id: 'ad-tostring',
    name: 'Function.prototype.toString 原生性与代码伪装',
    category: 'antidetect',
    status: toStringChecks.every((c) => c.passed) ? 'pass' : 'fail',
    actualValue: toStringChecks.every((c) => c.passed)
      ? '100% 原生代码规范 [native code]'
      : '存在函数 toString 伪装泄漏',
    expectedValue: '严格匹配浏览器原生 C++ 绑定表现',
    riskDescription: '高级反爬系统（如 DataDome）会调用 toString 验证函数底层字节码标记'
  });

  // =========================================================================
  // 2. 属性描述符 (Property Descriptor) 与 Illegal Invocation 严格审计
  // =========================================================================
  const testGetterDescriptor = (proto: any, prop: string, expectedGetterName: string) => {
    if (!proto) return;
    try {
      const desc = Object.getOwnPropertyDescriptor(proto, prop);
      if (!desc) {
        descriptorChecks.push({
          name: `${proto.constructor?.name || 'Object'}.${prop}`,
          passed: false,
          details: '属性描述符未定义'
        });
        score -= 10;
        return;
      }

      const isEnumerable = desc.enumerable === true;
      const isConfigurable = desc.configurable === true;
      const hasGetter = typeof desc.get === 'function';
      const noSetter = desc.set === undefined;
      const getterName = desc.get?.name;
      const passName = getterName === expectedGetterName;

      // a. 真正原生的 getter 函数是没有 .prototype 属性的！
      const hasNoPrototype = desc.get ? !('prototype' in desc.get) : false;

      // b. 真正原生的 getter 绝非构造函数：new 调用抛出 TypeError
      let getterNotConstructor = false;
      try {
        new (desc.get as any)();
      } catch (e) {
        getterNotConstructor = e instanceof TypeError;
      }

      // c. CreepJS 标志性测试：非法接收者调用 (Illegal Invocation)
      // 原生 Getter 被以普通对象 {} 或 null 作为 this 调用时必须严格抛出 TypeError: Illegal invocation
      let illegalInvocationPass = false;
      const getterFn = desc.get;
      try {
        if (getterFn) {
          (getterFn as Function).call({});
        }
      } catch (e) {
        illegalInvocationPass = e instanceof TypeError;
      }

      // d. 正常实例调用必须成功返回
      let normalCallPass = false;
      try {
        if (getterFn) {
          const val = (getterFn as Function).call(targetWin.navigator);
          normalCallPass = val !== undefined;
        }
      } catch {}

      // e. Getter 函数自身属性纯度：除 length 和 name 外无其他自有属性
      const ownNames = desc.get ? Object.getOwnPropertyNames(desc.get).sort() : [];
      const pureOwnNames = ownNames.length === 2 && ownNames[0] === 'length' && ownNames[1] === 'name';

      const passed =
        isEnumerable &&
        isConfigurable &&
        hasGetter &&
        noSetter &&
        passName &&
        hasNoPrototype &&
        getterNotConstructor &&
        illegalInvocationPass &&
        normalCallPass &&
        pureOwnNames;

      if (!passed) {
        score -= 10;
      }

      descriptorChecks.push({
        name: `Navigator.prototype.${prop} 描述符 & Illegal Invocation`,
        passed,
        details: passed
          ? `完美原生 Getter (enumerable: true, configurable: true, no .prototype, 非构造函数, 触发 Illegal invocation 拦截, 纯净自有属性)`
          : `异常: enum=${isEnumerable}, config=${isConfigurable}, noProto=${hasNoPrototype}, notCtor=${getterNotConstructor}, illegalInv=${illegalInvocationPass}, pureProps=${pureOwnNames}`
      });
    } catch (e: any) {
      score -= 10;
      descriptorChecks.push({
        name: `Navigator.prototype.${prop}`,
        passed: false,
        details: `获取失败: ${e?.message}`
      });
    }
  };

  testGetterDescriptor(targetWin.Navigator?.prototype, 'language', 'get language');
  testGetterDescriptor(targetWin.Navigator?.prototype, 'languages', 'get languages');

  checks.push({
    id: 'ad-descriptor',
    name: '原型链属性描述符完整度 (ES6 Getter 规范)',
    category: 'antidetect',
    status: descriptorChecks.every((c) => c.passed) ? 'pass' : 'fail',
    actualValue: descriptorChecks.every((c) => c.passed)
      ? '全属性描述符符合原生特征 (无 .prototype 漏洞, 完美防 Illegal Invocation 嗅探)'
      : '属性描述符存在细微破绽',
    expectedValue: 'enumerable: true, 无 prototype 污染, 拦截非法接收者',
    riskDescription: '指纹检测库会比对 Getter 函数是否带有额外的 prototype 属性及非法 receiver 是否抛出 Illegal Invocation'
  });

  // =========================================================================
  // 3. 原型链污染与自有属性检测 (Prototype Pollution & Reflect.ownKeys Check)
  // =========================================================================
  const navHasOwnLanguage = Object.prototype.hasOwnProperty.call(targetWin.navigator, 'language');
  const navHasOwnLanguages = Object.prototype.hasOwnProperty.call(targetWin.navigator, 'languages');
  const navProtoCorrect = Object.getPrototypeOf(targetWin.navigator) === targetWin.Navigator?.prototype;

  // 严格检查 Reflect.ownKeys(navigator) 中绝不包含被伪装的属性
  let reflectKeysClean = true;
  try {
    const keys = Reflect.ownKeys(targetWin.navigator);
    if (keys.includes('language') || keys.includes('languages') || keys.includes('userLanguage') || keys.includes('browserLanguage')) {
      reflectKeysClean = false;
    }
  } catch {}

  const protoPassed = !navHasOwnLanguage && !navHasOwnLanguages && navProtoCorrect && reflectKeysClean;
  if (!protoPassed) {
    score -= 20;
  }

  prototypeChecks.push({
    name: 'navigator.hasOwnProperty("language")',
    passed: !navHasOwnLanguage,
    details: !navHasOwnLanguage ? '通过 (属性挂载于 Navigator.prototype 原型链)' : '失败！属性被直接挂载在 navigator 实例上（粗暴篡改被识破）'
  });
  prototypeChecks.push({
    name: 'navigator.hasOwnProperty("languages")',
    passed: !navHasOwnLanguages,
    details: !navHasOwnLanguages ? '通过' : '失败！languages 成为自有属性'
  });
  prototypeChecks.push({
    name: 'Reflect.ownKeys(navigator) 纯度探测',
    passed: reflectKeysClean,
    details: reflectKeysClean ? '通过：navigator 实例未泄露任何语言劫持自有键' : '失败：Reflect.ownKeys 检出非法挂载的自有属性'
  });
  prototypeChecks.push({
    name: 'Object.getPrototypeOf(navigator)',
    passed: navProtoCorrect,
    details: navProtoCorrect ? '原型链完整指向 Navigator.prototype' : '原型链被破坏'
  });

  checks.push({
    id: 'ad-prototype',
    name: '原型链防篡改隔离检查 (Prototype Purity)',
    category: 'antidetect',
    status: protoPassed ? 'pass' : 'fail',
    actualValue: protoPassed ? '纯净原生原型链架构 (Reflect.ownKeys 纯正)' : '检出自有属性污染 (Prototype Pollution)',
    expectedValue: '属性必须在原型上，不可作为自有属性',
    riskDescription: '直接通过 navigator.language = "xxx" 赋值会被 hasOwnProperty 和 Reflect.ownKeys 检测立即定性为篡改脚本'
  });

  // =========================================================================
  // 4. 沙盒穿透对抗测试：动态 Iframe 穿透测试 (Bypass via Iframe & Detached Iframe)
  // =========================================================================
  let iframeTzProtected = false;
  let iframeLangProtected = false;
  let detachedIframeProtected = false;
  let iframeTzVal = '';
  let iframeLangVal = '';

  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    if (iframe.contentWindow) {
      const iWin = iframe.contentWindow as any;
      try {
        iframeTzVal = iWin.Intl?.DateTimeFormat().resolvedOptions().timeZone || '';
        iframeLangVal = iWin.navigator?.language || '';

        // 校验 iframe 里的时区与语言是否和主窗口伪装后一致
        const mainTz = targetWin.Intl.DateTimeFormat().resolvedOptions().timeZone;
        const mainLang = targetWin.navigator.language;

        iframeTzProtected = iframeTzVal === mainTz;
        iframeLangProtected = iframeLangVal === mainLang;

        // 测试 Detached Iframe 逃逸测试：从 DOM 中移除后，detached 窗口是否依然受保护
        document.body.removeChild(iframe);
        const detachedTz = iWin.Intl?.DateTimeFormat().resolvedOptions().timeZone || '';
        const detachedLang = iWin.navigator?.language || '';
        detachedIframeProtected = detachedTz === mainTz && detachedLang === mainLang;
      } catch {
        try { document.body.removeChild(iframe); } catch {}
      }
    } else {
      document.body.removeChild(iframe);
    }
  } catch {}

  const iframePass = iframeTzProtected && iframeLangProtected && detachedIframeProtected;
  if (!iframePass) {
    score -= 15;
  }

  iframeBypassChecks.push({
    name: '动态新建 iframe 时区同步防穿透',
    passed: iframeTzProtected,
    details: iframeTzProtected
      ? `已成功拦截同步：iframe 时区 (${iframeTzVal}) 与主窗口一致`
      : `穿透风险：iframe 泄露了时区 (${iframeTzVal})`
  });
  iframeBypassChecks.push({
    name: '动态新建 iframe 语言同步防穿透',
    passed: iframeLangProtected,
    details: iframeLangProtected
      ? `已成功拦截同步：iframe 语言 (${iframeLangVal}) 与主窗口一致`
      : `穿透风险：iframe 泄露了语言 (${iframeLangVal})`
  });
  iframeBypassChecks.push({
    name: 'Detached Iframe (移除 DOM 孤儿窗口) 逃逸对抗',
    passed: detachedIframeProtected,
    details: detachedIframeProtected
      ? '防御成功：即使从 DOM 节点中强行剥离 iframe，孤儿 window 对象依然维持受控伪装'
      : '存在逃逸风险：Detached iframe 发生穿透'
  });

  checks.push({
    id: 'ad-iframe',
    name: 'Iframe 沙盒与 Detached 孤儿窗口穿透对抗测试',
    category: 'antidetect',
    status: iframePass ? 'pass' : 'warn',
    actualValue: iframePass ? '🛡️ 拦截成功，同步及 Detached iframe 均无法穿透读取底层环境' : '⚠️ iframe 探测存在轻微穿透风险',
    expectedValue: '新建及 Detached iframe 必须继承伪装配置',
    riskDescription: '黑客检测脚本常在网页中静默创建 iframe 并立即 remove() 试图逃逸插件 Hook'
  });

  // =========================================================================
  // 5. 错误堆栈特征泄露审计 (Error.stack Leak Check)
  // =========================================================================
  let stackLeaksExtension = false;
  let stackSnippet = '';
  try {
    const err = new Error('VM_STACK_PROBE');
    stackSnippet = err.stack || '';

    // 测试 captureStackTrace (如果存在)
    if (typeof (Error as any).captureStackTrace === 'function') {
      const probeObj: any = {};
      (Error as any).captureStackTrace(probeObj);
      stackSnippet += ' ' + (probeObj.stack || '');
    }

    // 测试真实抛出异常的堆栈
    try {
      (null as any).probePropertyAccess();
    } catch (e: any) {
      stackSnippet += ' ' + (e?.stack || '');
    }

    if (
      stackSnippet.includes('chrome-extension://') ||
      stackSnippet.includes('injected.js') ||
      stackSnippet.includes('VanishMe')
    ) {
      stackLeaksExtension = true;
      score -= 15;
    }
  } catch {}

  stackLeakChecks.push({
    name: 'Error.stack 扩展资源路径清洗检测',
    passed: !stackLeaksExtension,
    details: !stackLeaksExtension
      ? '堆栈已深度净化：涵盖 new Error、captureStackTrace 及运行时 TypeError 异常，均未泄露任何扩展 URL'
      : '警告：Error.stack 中残留了扩展注入脚本的 URL 特征！'
  });

  checks.push({
    id: 'ad-stack',
    name: '异常堆栈追踪清洗 (Error.stack Stealth)',
    category: 'antidetect',
    status: !stackLeaksExtension ? 'pass' : 'warn',
    actualValue: !stackLeaksExtension ? '堆栈特征已净化' : '堆栈包含扩展特征',
    expectedValue: '无 chrome-extension:// 痕迹',
    riskDescription: '网站可通过捕获异常的 stack 字符串定位是否存在任何第三方插件 Hook'
  });

  const finalScore = Math.max(0, Math.min(100, score));
  let overallStealth: 'native_grade' | 'minor_anomaly' | 'compromised' = 'native_grade';
  if (finalScore < 60) {
    overallStealth = 'compromised';
  } else if (finalScore < 90) {
    overallStealth = 'minor_anomaly';
  }

  return {
    audit: {
      toStringChecks,
      descriptorChecks,
      prototypeChecks,
      iframeBypassChecks,
      stackLeakChecks,
      overallStealth
    },
    checks
  };
}
