var e = [`Asia/Shanghai`, `Asia/Urumqi`, `Asia/Chongqing`, `Asia/Chungking`, `Asia/Harbin`, `Asia/Kashgar`]
  , t = [`Asia/Shanghai`, `Asia/Urumqi`]
  , n = [`Asia/Hong_Kong`, `Asia/Macau`, `Asia/Taipei`]
  , r = [`Microsoft YaHei`, `Microsoft YaHei UI`, `SimSun`, `NSimSun`, `SimHei`, `KaiTi`, `FangSong`, `DengXian`, `PingFang SC`, `Hiragino Sans GB`, `STHeiti`, `STSong`, `Songti SC`, `Source Han Sans CN`, `Source Han Sans SC`, `Noto Sans CJK SC`, `Noto Serif CJK SC`, `WenQuanYi Micro Hei`, `WenQuanYi Zen Hei`]
  , i = [`Microsoft JhengHei`, `PMingLiU`, `MingLiU`, `DFKai-SB`, `PingFang TC`, `PingFang HK`, `Source Han Sans TW`, `Noto Sans CJK TC`];
function a() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || ``
    } catch {
        return ``
    }
}
function o() {
    let r = a()
      , i = 0;
    return t.includes(r) || e.includes(r) ? i = 1 : n.includes(r) && (i = .6),
    {
        raw: r || `unknown`,
        score: i
    }
}
function s() {
    let e = new Date().getTimezoneOffset()
      , t = -e / 60;
    return {
        raw: `UTC${t >= 0 ? `+` : `-`}${Math.abs(t)}`,
        score: e === -480 ? .7 : 0
    }
}
function c() {
    return (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).map(e => (e || ``).toLowerCase())
}
function l() {
    let e = c()
      , t = e[0] || ``
      , n = 0
      , r = e => e.startsWith(`zh-cn`) || e.includes(`hans`) || e === `zh`;
    return r(t) ? n = 1 : (e => e.startsWith(`zh-tw`) || e.startsWith(`zh-hk`) || e.startsWith(`zh-mo`) || e.includes(`hant`))(t) ? n = .5 : e.some(r) ? n = .7 : e.some(e => e.startsWith(`zh`)) && (n = .4),
    {
        raw: e.join(`, `) || `unknown`,
        score: n
    }
}
function u() {
    let e = ``;
    try {
        e = Intl.DateTimeFormat().resolvedOptions().locale || ``
    } catch {
        e = ``
    }
    let t = e.toLowerCase()
      , n = 0;
    return t.startsWith(`zh-cn`) || t.includes(`hans`) || t === `zh` ? n = 1 : t.startsWith(`zh`) && (n = .5),
    {
        raw: e || `unknown`,
        score: n
    }
}
function d(e, t) {
    let n = `中文字体检测ABCabc012`
      , r = `72px`;
    return [`monospace`, `sans-serif`, `serif`].some(i => {
        t.font = `${r} ${i}`;
        let a = t.measureText(n).width;
        t.font = `${r} "${e}", ${i}`;
        let o = t.measureText(n).width;
        return Math.abs(o - a) > .5
    }
    )
}
function f() {
    let e = document.createElement(`canvas`).getContext(`2d`);
    if (!e)
        return {
            raw: `canvas unavailable`,
            score: 0
        };
    let t = r.filter(t => d(t, e))
      , n = i.filter(t => d(t, e))
      , a = 0;
    t.length >= 1 ? a = Math.min(1, .75 + .08 * t.length) : n.length >= 1 && (a = .5);
    let o = [...t, ...n];
    return {
        raw: o.length ? o.slice(0, 4).join(`, `) + (o.length > 4 ? `…` : ``) : `none detected`,
        score: a
    }
}
function p() {
    let e = (navigator.userAgent || ``).toLowerCase()
      , t = `${(navigator.platform || ``).toLowerCase()} ${e}`
      , n = `Unknown`;
    return /iphone|ipad|ipod|mac/.test(t) ? n = `Apple` : /android/.test(t) ? n = `Google` : /win/.test(t) ? n = `Microsoft` : /cros/.test(t) ? n = `Google` : /linux/.test(t) && (n = `Linux / Other`),
    {
        raw: `${n} style`,
        score: {
            Apple: .25,
            Microsoft: .4,
            Google: .35,
            "Linux / Other": .5,
            Unknown: .4
        }[n] ?? .4
    }
}
var m = {
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    clockOffset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4h4"/></svg>`,
    globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 3 2.6 15 0 18M12 3c-2.6 3-2.6 15 0 18"/></svg>`,
    type: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6V5h14v1M12 5v14M9 19h6"/></svg>`,
    sliders: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16M4 16h16"/><circle cx="9" cy="8" r="2.2"/><circle cx="15" cy="16" r="2.2"/></svg>`,
    smile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.4 2 3.5 2 3.5-2 3.5-2"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>`
}
  , h = [{
    id: `timezone`,
    weight: 30,
    claudeUsed: !0,
    icon: m.clock,
    detect: o
}, {
    id: `language`,
    weight: 24,
    icon: m.globe,
    detect: l
}, {
    id: `fonts`,
    weight: 20,
    icon: m.type,
    detect: f
}, {
    id: `intlLocale`,
    weight: 10,
    icon: m.sliders,
    detect: u
}, {
    id: `timezoneOffset`,
    weight: 8,
    icon: m.clockOffset,
    detect: s
}, {
    id: `emoji`,
    weight: 8,
    icon: m.smile,
    detect: p
}];
function g(e) {
    return e <= 30 ? `low` : e <= 60 ? `medium` : `high`
}
function _(e) {
    return e >= .6 ? `high` : e >= .25 ? `medium` : `low`
}
var v = [{
    id: `deepseek`,
    name: `DeepSeek`,
    url: `https://www.deepseek.com/?from=fuck-claude`,
    img: `/cn-models/deepseek.webp`,
    imgWidth: 342,
    imgHeight: 360,
    tagline: {
        zh: `深度求索，开源之光`,
        en: `Open-source power from the deep`
    },
    side: `left`
}, {
    id: `glm`,
    name: `GLM`,
    url: `https://bigmodel.cn/claude-code-plan?from=fuck-claude`,
    img: `/cn-models/glm.webp`,
    imgWidth: 313,
    imgHeight: 360,
    tagline: {
        zh: `智谱 GLM，Claude Code 无缝平替`,
        en: `Drop-in Claude Code replacement`
    },
    side: `left`
}, {
    id: `kimi`,
    name: `Kimi`,
    url: `https://www.kimi.com/code?from=fuck-claude`,
    img: `/cn-models/kimi.webp`,
    imgWidth: 322,
    imgHeight: 360,
    tagline: {
        zh: `月之暗面，代码正面`,
        en: `Moonshot AI’s coding sidekick`
    },
    side: `right`
}]
  , y = {
    en: {
        "meta.title": `Fuck Claude | Are You a Claude "China User"?`,
        "meta.description": `One-click check of your browser timezone, language, Chinese fonts and locale to see if Claude Code would flag you as a China user. 100% local, nothing uploaded.`,
        "nav.title": `Fuck Claude`,
        credit: `Built with Claude Fable 5`,
        "hero.title": `Are you a Claude “China user”?`,
        "hero.badge.local": `100% local scan`,
        "hero.badge.noUpload": `Results never uploaded`,
        "hero.badge.openSource": `Open source`,
        "hero.scoreOutOf": `/ 100`,
        "sponsors.label": `Sponsors`,
        "sponsors.cta": `Want to be listed here?`,
        "cnModels.label": `Chinese AI models`,
        "cnModels.slogan": `Chinese models are simply better`,
        "cnModels.cta": `Check it out`,
        "band.low.title": `Low risk`,
        "band.low.desc": `🐶You are not a “Claude China user”🐶`,
        "band.medium.title": `Medium risk`,
        "band.medium.desc": `🐶You are probably a “Claude China user”🐶`,
        "band.high.title": `High risk`,
        "band.high.desc": `🐶You are definitely a “Claude China user”🐶`,
        "band.high.extra": `But you still have`,
        "band.high.extraLink": `Kimi Code`,
        "signal.timezone.name": `System timezone`,
        "signal.timezone.desc": `Intl.DateTimeFormat exposes the same OS timezone Claude Code reads; compared against Asia/Shanghai, Asia/Urumqi and other China zones.`,
        "signal.language.name": `Browser language`,
        "signal.language.desc": `navigator.languages — zh-CN / Simplified Chinese at the top of the list scores highest.`,
        "signal.fonts.name": `Installed Chinese fonts`,
        "signal.fonts.desc": `Canvas width-probing for Simplified / Traditional Chinese fonts such as Microsoft YaHei and PingFang SC.`,
        "signal.intlLocale.name": `Intl locale`,
        "signal.intlLocale.desc": `The locale your browser resolves for date and number formatting.`,
        "signal.timezoneOffset.name": `Timezone offset`,
        "signal.timezoneOffset.desc": `Whether getTimezoneOffset() equals UTC+8.`,
        "signal.emoji.name": `Emoji rendering style`,
        "signal.emoji.desc": `OS vendor guessed from the user agent; a weak, loosely correlated signal.`,
        "scan.detecting": `Checking`,
        "scan.ready": `Ready to scan`,
        "result.hitsTitle": `Matched signals`,
        "result.noHits": `No strong China signals matched. Low risk.`,
        "signals.title": `What gets scanned`,
        "signals.sub": `Six locale fingerprints, weighted to a 0–100 risk score.`,
        "how.title": `How the check works`,
        "how.p1": `When Claude Code is pointed at a proxy endpoint via ANTHROPIC_BASE_URL, public reverse-engineering reports found it reads your operating-system timezone and the proxy hostname, then hides the verdict inside the system prompt with Unicode steganography — the date separator and four look-alike apostrophes in the “Today’s date” line encode whether you look like a China user.`,
        "how.p2": `A web page cannot read everything Claude Code can, but the key signal is identical: this tool reads the same OS timezone, then adds five more browser-visible locale fingerprints — UI language, installed Chinese fonts, Intl locale, UTC+8 offset and emoji style — into a weighted score. Signals scoring ≥0.25 count as hits; bands are Low 0–30, Medium 31–60, High 61–100.`,
        "ui.weight": `Weight`,
        "faq.title": `FAQ`,
        "faq.q1": `Does Claude really check my timezone?`,
        "faq.a1": `According to public reverse-engineering reports, when Claude Code talks to a non-official endpoint it reads the OS timezone and proxy hostname, and steganographically encodes the result into its system prompt. The timezone this page reads via Intl.DateTimeFormat is the very same OS timezone.`,
        "faq.q2": `Is this score the exact check Claude runs?`,
        "faq.a2": `No. Only the system timezone maps one-to-one onto Claude’s reported mechanism. The other five signals are common Chinese-environment fingerprints that correlate with it, so treat the score as an estimate, not a verdict.`,
        "faq.q3": `How do I lower my score?`,
        "faq.a3": `Switch your OS timezone away from China zones such as Asia/Shanghai, move zh-CN off the top of your browser language list, and avoid routing Claude Code through proxies whose hostnames contain flagged domains or AI-lab keywords.`,
        "faq.q4": `Is any data uploaded?`,
        "faq.a4": `No. Every check runs locally in your browser and none of the detected signals are ever sent anywhere. The site only loads standard Google Analytics for anonymous page-view stats.`,
        "privacy.title": `Privacy`,
        "privacy.body": `Every check runs locally in your browser — your scan results never leave your device. The site only loads Google Analytics for anonymous page-view stats; none of the detected signals are ever sent.`,
        "footer.disclaimer": `For reference only, based on public reverse-engineering reports. Not an official statement or advice.`,
        "ui.claudeBadge": `Claude Same`,
        "ui.retest": `Scan again`,
        "ui.start": `Start scan`
    },
    zh: {
        "meta.title": `Fuck Claude ｜ 你是「Claude 中国用户」吗`,
        "meta.description": `一键检测浏览器时区、语言、中文字体与 locale 等信号,评估你是否会被 Claude Code 判定为中国用户并有封号风险。纯本地运行,零数据上传。`,
        "nav.title": `Fuck Claude`,
        credit: `此网站使用 Claude Fable 5 开发`,
        "hero.title": `你是「Claude 中国用户」吗`,
        "hero.badge.local": `纯本地检测`,
        "hero.badge.noUpload": `结果零上传`,
        "hero.badge.openSource": `开源代码`,
        "hero.scoreOutOf": `/ 100`,
        "sponsors.label": `赞助商`,
        "sponsors.cta": `想显示在下方？`,
        "cnModels.label": `国产大模型`,
        "cnModels.slogan": `模型还是中国的好`,
        "cnModels.cta": `去看看`,
        "band.low.title": `低风险`,
        "band.low.desc": `🐶你不是「Claude 中国用户」🐶`,
        "band.medium.title": `中等风险`,
        "band.medium.desc": `🐶你可能是「Claude 中国用户」🐶`,
        "band.high.title": `高风险`,
        "band.high.desc": `🐶你绝对是「Claude 中国用户」🐶`,
        "band.high.extra": `但是你还有`,
        "band.high.extraLink": `Kimi Code`,
        "signal.timezone.name": `系统时区`,
        "signal.timezone.desc": `Intl.DateTimeFormat 读到的就是 Claude Code 读取的同一个系统时区,与 Asia/Shanghai、Asia/Urumqi 等中国时区比对。`,
        "signal.language.name": `浏览器语言`,
        "signal.language.desc": `检查 navigator.languages;首选 zh-CN / 简体中文得分最高。`,
        "signal.fonts.name": `已安装中文字体`,
        "signal.fonts.desc": `用 canvas 宽度探测微软雅黑、苹方等简繁中文字体。`,
        "signal.intlLocale.name": `Intl 区域设置`,
        "signal.intlLocale.desc": `浏览器用于日期 / 数字格式化的 locale。`,
        "signal.timezoneOffset.name": `时区偏移`,
        "signal.timezoneOffset.desc": `getTimezoneOffset() 是否为 UTC+8。`,
        "signal.emoji.name": `Emoji 渲染风格`,
        "signal.emoji.desc": `由 UA 推断操作系统厂商,弱相关信号。`,
        "scan.detecting": `检测中`,
        "scan.ready": `待检测`,
        "result.hitsTitle": `命中的信号`,
        "result.noHits": `没有命中明显的中国信号,风险较低。`,
        "signals.title": `检测哪些信号`,
        "signals.sub": `六项区域指纹,加权得出 0–100 风险分。`,
        "how.title": `检测原理`,
        "how.p1": `当 Claude Code 通过 ANTHROPIC_BASE_URL 指向中转端点时,据公开逆向分析,它会读取操作系统时区与中转 hostname,再把结果用 Unicode 隐写术藏进 system prompt:「Today’s date」那一行的日期分隔符和 4 种几乎一样的撇号变体,编码了你是否像中国用户。`,
        "how.p2": `网页读不到 Claude Code 能读的全部信息,但关键信号完全一致:本工具读取同一个系统时区,再叠加浏览器语言、中文字体、Intl locale、UTC+8 偏移与 emoji 风格五项指纹,加权得分。得分 ≥0.25 计为命中;分档:低 0–30、中 31–60、高 61–100。`,
        "ui.weight": `权重`,
        "faq.title": `常见问题`,
        "faq.q1": `Claude 真的会检查我的时区吗?`,
        "faq.a1": `据公开逆向分析,Claude Code 连接非官方端点时会读取系统时区与中转 hostname,并把结果隐写进 system prompt。本页通过 Intl.DateTimeFormat 读到的,正是同一个系统时区。`,
        "faq.q2": `这个分数就是 Claude 的真实判定吗?`,
        "faq.a2": `不是。只有系统时区能与 Claude 被披露的机制一一对应,其余五项是与之相关的「中文环境指纹」。分数是估计,不是定论。`,
        "faq.q3": `怎么降低分数?`,
        "faq.a3": `把系统时区改出 Asia/Shanghai 等中国时区,把 zh-CN 从浏览器语言列表首位移除,并避免让 Claude Code 走 hostname 含敏感域名 / AI 实验室关键词的中转。`,
        "faq.q4": `会上传我的数据吗?`,
        "faq.a4": `不会。所有检测都在浏览器本地完成,检测到的任何信号都不会被发送。网站仅加载 Google Analytics 统计匿名访问量。`,
        "privacy.title": `隐私说明`,
        "privacy.body": `所有检测都在你的浏览器本地完成,扫描结果不会离开你的设备。网站仅加载 Google Analytics 统计匿名页面访问量,检测到的信号不会被发送。`,
        "footer.disclaimer": `本工具仅供参考,基于公开逆向分析,不构成任何官方结论或建议。`,
        "ui.claudeBadge": `Claude 同款`,
        "ui.retest": `重新扫描`,
        "ui.start": `开始检测`
    }
};
function b(e) {
    let t = y[e] ?? y.en;
    return function(e) {
        return t[e] ?? y.en[e] ?? e
    }
}
var x = v.find(e => e.id === `kimi`)?.url ?? `https://www.kimi.com/code?from=fuck-claude`
  , S = 460
  , C = 150;
function w() {
    return document.documentElement.lang.toLowerCase().startsWith(`zh`) ? `zh` : `en`
}
var T = b(w());
function E(e, t=document) {
    return t.querySelector(e)
}
var D = e => new Promise(t => setTimeout(t, e))
  , O = 2 * Math.PI * 52;
function k(e) {
    E(`#mascot`)?.setAttribute(`data-state`, e)
}
function A(e) {
    let t = E(`#score-ring`)
      , n = E(`#score-value`);
    t && (t.style.strokeDasharray = `${O}px`,
    t.style.strokeDashoffset = `${O * (1 - e / 100)}px`),
    n && (n.textContent = String(e))
}
function j() {
    A(0);
    let e = E(`#score-gauge`);
    e?.removeAttribute(`data-band`),
    e?.setAttribute(`data-scanning`, `true`);
    let t = E(`#risk-badge`);
    t && (t.textContent = T(`scan.detecting`) + `…`,
    t.removeAttribute(`data-band`));
    let n = E(`#risk-desc`);
    n && (n.textContent = ``);
    let r = E(`#result`);
    r && (r.hidden = !0);
    for (let e of h) {
        let t = E(`[data-signal="${e.id}"]`);
        if (!t)
            continue;
        t.classList.remove(`is-active`, `is-done`),
        t.classList.add(`is-pending`),
        t.removeAttribute(`data-verdict`);
        let n = E(`[data-field="value"]`, t)
          , r = E(`[data-field="contribution"]`, t)
          , i = E(`[data-field="dot"]`, t);
        n && (n.textContent = ``),
        r && (r.textContent = ``),
        i && (i.className = `dot`)
    }
}
function M(e, t) {
    let n = g(e);
    k(n),
    E(`#score-gauge`)?.removeAttribute(`data-scanning`),
    E(`#score-gauge`)?.setAttribute(`data-band`, n);
    let r = E(`#risk-badge`);
    r && (r.textContent = T(`band.${n}.title`),
    r.setAttribute(`data-band`, n));
    let i = E(`#risk-desc`);
    if (i && (i.textContent = T(`band.${n}.desc`),
    n === `high`)) {
        i.append(` ${T(`band.high.extra`)} `);
        let e = document.createElement(`a`);
        e.href = x,
        e.target = `_blank`,
        e.rel = `noopener noreferrer`,
        e.textContent = T(`band.high.extraLink`),
        e.setAttribute(`data-ga-event`, `cn_model_click`),
        e.setAttribute(`data-ga-id`, `kimi-band-high`),
        i.appendChild(e)
    }
    let a = E(`#result-title`)
      , o = E(`#result-hits`);
    if (o && (o.innerHTML = ``),
    t.length === 0)
        a && (a.textContent = T(`result.noHits`));
    else {
        a && (a.textContent = T(`result.hitsTitle`));
        for (let {signal: e, contribution: n} of t) {
            let t = document.createElement(`span`);
            t.className = `chip`,
            t.setAttribute(`data-verdict`, _(n / e.weight)),
            t.innerHTML = `<span class="chip__icon">${e.icon}</span><span>${T(`signal.${e.id}.name`)}</span><b>+${n}</b>`,
            o.appendChild(t)
        }
    }
    let s = E(`#result`);
    s && (s.hidden = !1)
}
var N = !1;
async function P() {
    if (N)
        return;
    N = !0;
    let e = E(`#retest`);
    e && (e.disabled = !0),
    k(`search`),
    j(),
    await D(C);
    let t = 0
      , n = [];
    for (let e of h) {
        let r = E(`[data-signal="${e.id}"]`);
        r?.classList.remove(`is-pending`),
        r?.classList.add(`is-active`),
        await D(S);
        let i;
        try {
            i = e.detect()
        } catch {
            i = {
                raw: `—`,
                score: 0
            }
        }
        let a = Math.round(i.score * e.weight)
          , o = _(i.score);
        if (t += a,
        r) {
            let e = E(`[data-field="value"]`, r)
              , t = E(`[data-field="contribution"]`, r)
              , n = E(`[data-field="dot"]`, r);
            e && (e.textContent = i.raw),
            t && (t.textContent = `+${a}`),
            n && (n.className = `dot dot--${o}`),
            r.classList.remove(`is-active`),
            r.classList.add(`is-done`),
            r.setAttribute(`data-verdict`, o)
        }
        A(Math.min(100, t)),
        o !== `low` && n.push({
            signal: e,
            contribution: a
        }),
        await D(C)
    }
    M(Math.min(100, t), n);
    let r = E(`#retest-label`);
    r && (r.textContent = T(`ui.retest`)),
    e && (e.disabled = !1),
    N = !1
}
function F() {
    E(`#retest`)?.addEventListener(`click`, () => P())
}
document.readyState === `loading` ? document.addEventListener(`DOMContentLoaded`, F) : F();
