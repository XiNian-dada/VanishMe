<div align="center">

<img src="images/banner-zh.png" alt="VanishMe Banner" width="100%"/>

# VanishMe · 消失的我 🥷
### 专业级浏览器指纹伪装与反风控利器，让你的环境天衣无缝

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome / Edge](https://img.shields.io/badge/Browser-Chrome%20%7C%20Edge-blue.svg)](https://www.google.com/chrome/)
[![Version: 1.2.0](https://img.shields.io/badge/Version-1.2.0-brightgreen.svg)](https://github.com/XiNian-dada/VanishMe/releases)

[中文说明](#-为什么需要-vanishme) | [English Documentation](#english)

</div>

---

## 💡 为什么需要 VanishMe？

你是否遇到过这样的情况：
- **明明挂了海外代理**，打开 Claude、ChatGPT 或海外网站，却依然弹出**“当前地区不可用”**或直接触发封号？
- 登录某些电商、社交平台时，总是频繁跳出**风控验证码**或被标记为异常风险账号？

这是因为现代网站不仅看你的 IP 地址，更会**深度探测你的浏览器底层指纹与软硬件环境**：
1. **时区露馅**：代理在美西洛杉矶（UTC-8），浏览器时区却暴露了中国标准时间（UTC+8）。
2. **语言与 Intl 泄露**：系统语言虽然调成了英文，但 JavaScript 底层 API（如 `Intl.DateTimeFormat`、`Intl.RelativeTimeFormat`、`Intl.ListFormat`）仍会悄悄出卖你的真实中文环境。
3. **本地中文字体嗅探**：宿主机安装的微软雅黑、苹方、宋体等字体被 Canvas 差分度量探针一秒识破。
4. **系统语音引擎出卖语种**：系统 TTS 注册的中文发音人（如婷婷、Eddy 等）暴露了真实系统语系。
5. **WebRTC 穿透**：网页通过 WebRTC STUN 协议直接绕过系统代理，穿透出你的内网 IP 或国内物理公网 IPv4/IPv6。
6. **劣质插件反被识破**：许多指纹插件由于实现简陋、直接覆写原生方法，在 CreepJS / DataDome 的原型描述符、Illegal Invocation 和堆栈检测下一触即溃。

👉 **VanishMe 就是为了彻底解决上述痛点而生。**

---

## 🌟 核心优势（v1.2.0 最新特性）

- 🔬 **内置超严苛隐私与指纹排查中心**：仿照 iplark、browserscan、iprisk、fuck-claude 工业级规范。提供本地 0 依赖超严苛体检中心，一键深度排查时区、语言、全套 7 种 Intl API、45+ 款中文字体、语音模型、WebRTC STUN 穿透候选与物理 IP。
- 📍 **修复 Issue #2（测试页环境与普通网站 100% 对齐）**：彻底解决内置测试页触发 geolocation 权限警告的问题。测试页在受保护沙盒接口下运行，直接返回虚拟海外经纬度，无需向浏览器申请底层物理 GPS 权限，0 警告防泄漏。
- 🌐 **WebRTC STUN 穿透硬核阻断与运营商 IPv6 识别**：JS 层深度拦截 `RTCPeerConnection`，不仅精准阻断内网与 TUN 旁路 IP，更能深度识别防范电信/联通/移动物理 IPv6（`240e`/`2408`/`2409`）候选外泄。
- 🥷 **CreepJS / DataDome 级原生伪装隐蔽度**：
  - **Illegal Invocation 拦截**：对标原生 V8 规范，Getter 接收非合规 receiver（如 `{}`）时精确抛出 `TypeError: Illegal invocation`；
  - **Non-constructor 防御**：原生方法和 Getter 严禁通过 `new` 调用（精确抛出 `TypeError`），无 `.prototype` 破绽；
  - **原型链纯净度**：`Reflect.ownKeys` 绝不残留实例自有键，`fn.toString === Function.prototype.toString`；
  - **Detached Iframe 对抗**：拦截 `contentWindow` Getter，即便网页强行将 iframe 剥离 DOM（孤儿窗口逃逸），依然继承受控伪装；
  - **全场景 Error.stack 堆栈净化**：无任何 `chrome-extension://`、`injected.js` 或插件特征字串残留。
- 🗣️ **系统语音发音人 (SpeechSynthesis) 语种屏蔽**：自动过滤并隐藏宿主机系统注册的中文发音人模型，彻底封堵商业语种探针。
- 🎨 **45+ 款典型中文字体差分度量与混淆屏蔽**：全面防御基于 Canvas `measureText` 和 `document.fonts.check` 的本地字体嗅探。
- 🔄 **网络层与 JS 底层“表里如一”**：修改语言和时区时，不仅前端 JS 呈现目标地区格式，发往网站的 HTTP 请求头（Declarative Net Request）也自动同步修改，绝不自相矛盾。
- ⚡ **开箱即用，一键秒切**：内置美国、日本、新加坡、德国等常用地区预设，点击即可自动配置经纬度、时区和语言环境。

---

## 🚀 3 步极速上手

1. **点击扩展图标**，展开快捷面板。
2. **选择目标地区**（例如点击 🇺🇸 **美国** 或 🇯🇵 **日本**）。
3. **刷新网页**，全套伪装环境即刻生效！

---

## 🎯 规则模式说明（大白话版）

并非所有网站都需要伪装，VanishMe 提供了三种灵活省心的模式：

- 🟢 **白名单模式（强烈推荐）**：平时不打扰。只有你添加到列表中的网站（如 Claude、ChatGPT、海外电商）才会开启伪装，国内网站完全保持原样，互不干扰。
- 🌐 **全局模式**：对所有打开的网页统一开启伪装，适合需要全局隐私隐匿的场景。
- 🔴 **黑名单模式**：默认对所有网站伪装，但可以排除特定几个不需要伪装的站点。

> 💡 **快捷技巧**：在任意目标网页上打开插件面板，点击“当前网站：启用”，即可一键将该站点加入白名单，无需手动复制粘贴网址。

---

## 📦 安装方法

### 方式一：直接安装（推荐小白）

1. 前往 [Releases 发布页](https://github.com/XiNian-dada/VanishMe/releases) 下载最新版本的 `VanishMe-v1.2.0.zip`。
2. 解压下载的压缩包，得到 `dist` 文件夹。
3. 打开 Chrome 或 Edge 浏览器，在地址栏输入对应地址：
   - **Edge 浏览器**：`edge://extensions/`
   - **Chrome 浏览器**：`chrome://extensions/`
4. 开启页面右上角的 **“开发者模式”** 开关。
5. 点击左上角的 **“加载已解压的扩展程序”**，选择刚刚解压出的 `dist` 文件夹即可完成安装。

### 方式二：从源码编译（开发者）

```bash
# 克隆仓库
git clone https://github.com/XiNian-dada/VanishMe.git
cd VanishMe

# 安装依赖
npm install

# 编译构建
npm run build

# 编译后的扩展文件位于 dist 目录
```

---

## 🧪 隐私与指纹效果对比

使用 VanishMe 后，即使在极其严苛的指纹检测网站中，修改痕迹也会被完全隐藏，呈现出与目标地区真实机器一致的状态：

<table>
  <tr>
    <th align="center">未启用 VanishMe（漏洞百出）</th>
    <th align="center">启用 VanishMe 后（完美伪装）</th>
  </tr>
  <tr>
    <td><img src="images/before/detection-before-1.png" alt="检测前 1" width="400"/></td>
    <td><img src="images/after/detection-after-1.png" alt="检测后 1" width="400"/></td>
  </tr>
  <tr>
    <td><img src="images/before/detection-before-2.png" alt="检测前 2" width="400"/></td>
    <td><img src="images/after/detection-after-2.png" alt="检测后 2" width="400"/></td>
  </tr>
  <tr>
    <td><img src="images/before/detection-before-3.png" alt="检测前 3" width="400"/></td>
    <td><img src="images/after/detection-after-3.png" alt="检测后 3" width="400"/></td>
  </tr>
</table>

推荐自测站点：
- [BrowserScan 指纹真实度评测](https://www.browserscan.net/)（推荐测试真机评分与语言匹配）
- [iprisk.top 原生 API 完整性检测](https://iprisk.top/)
- [BrowserLeaks 综合反指纹检测](https://browserleaks.com/)

---

## 🤝 交流与反馈

**学 AI 上 LinuxDo: [https://linux.do/](https://linux.do/)**

欢迎提交 Issue 反馈建议，或发起 Pull Request 一同改进项目！

---

## English

<div align="center">

<img src="images/banner-en.png" alt="VanishMe Banner" width="100%"/>

# VanishMe 🥷
### Professional Browser Fingerprint Disguise & Anti-Detection Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome / Edge](https://img.shields.io/badge/Browser-Chrome%20%7C%20Edge-blue.svg)](https://www.google.com/chrome/)
[![Version: 1.2.0](https://img.shields.io/badge/Version-1.2.0-brightgreen.svg)](https://github.com/XiNian-dada/VanishMe/releases)

</div>

### 💡 Why VanishMe?

Have you ever encountered these issues:
- Even when using a high-quality proxy, services like Claude, ChatGPT, or regional websites still prompt **"Service not available in your region"** or flag your account?
- Frequent CAPTCHAs or suspicious activity verification on overseas platforms?

Modern platforms do not merely inspect your IP address — they deeply inspect your **underlying browser fingerprint and operating environment**:
1. **Timezone Discrepancies**: Your proxy is in Los Angeles (UTC-8), but your browser reveals your local timezone (e.g. UTC+8).
2. **Language & Intl Leakage**: Even if you change the UI language, JavaScript APIs like `Intl` (`Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, `Intl.ListFormat`) still reveal your underlying OS locale.
3. **Local Chinese Font Sniffing**: Installed fonts like SimSun, Microsoft YaHei, or PingFang are probed via Canvas differential metrics.
4. **TTS Speech Synthesis Voice Models**: Voices registered by the host OS reveal your underlying language.
5. **WebRTC STUN Leakage**: WebRTC STUN queries can bypass proxies and expose your true local LAN or ISP physical IPv4/IPv6 addresses.
6. **Poorly Made Extensions Get Detected**: Naive proxies trigger CreepJS and DataDome detection traps (Illegal Invocation, prototype pollution, stack traces).

👉 **VanishMe is designed to solve all of these issues seamlessly.**

### 🌟 Core Highlights (v1.2.0)

- 🔬 **Built-in Ultra-Strict Fingerprint & Leak Audit Center**: Modeled after iplark, browserscan, iprisk, and fuck-claude industrial standards. Perform local, zero-dependency diagnostics across timezones, offsets, 7 Intl APIs, 45+ Chinese fonts, TTS voices, and WebRTC STUN leaks.
- 📍 **Resolves Issue #2 (Protected Context Alignment)**: Eliminates Chrome/Edge geolocation permission warnings on the diagnostic page. Runs inside the protected sandbox context and returns virtual coordinates with zero physical GPS queries.
- 🌐 **WebRTC STUN Leak Interception & China ISP IPv6 Detection**: Blocks private LAN candidates (`10.x`, `192.168.x`), TUN interface candidates, and catches leaked domestic physical IPv6 (`240e`/`2408`/`2409`).
- 🥷 **CreepJS / DataDome-Grade Stealth**:
  - **Illegal Invocation Defense**: Native getters throw `TypeError: Illegal invocation` when called with invalid receivers (e.g. `{}`);
  - **Non-constructor Compliance**: Hooked methods cannot be invoked via `new` (throws `TypeError`) and have no `.prototype` property;
  - **Prototype Purity**: `Reflect.ownKeys` contains no leaked own properties on instances;
  - **Detached Iframe Defense**: Hooks `contentWindow` to maintain protected spoofing even when iframes are detached from DOM;
  - **Full Error.stack Sanitization**: Cleanses all traces of `chrome-extension://` and script filenames.
- 🗣️ **TTS SpeechSynthesis Voice Filter**: Filters and hides Chinese speech synthesis voice models registered by the host OS.
- 🎨 **Canvas Differential Font Shielding for 45+ Fonts**: Defends against font enumeration attacks via Canvas `measureText` and `document.fonts.check`.
- 🔄 **Network & Client Synchronization**: Keeps HTTP request headers (`Accept-Language`) in 100% sync with in-page JavaScript APIs via Declarative Net Request.
- ⚡ **One-Click Presets**: Pre-configured profiles for the US, Japan, Singapore, Germany, and more.

### 🚀 3-Step Quick Start

1. **Click the extension icon** in your browser toolbar.
2. **Select your target region** (e.g., 🇺🇸 United States or 🇯🇵 Japan).
3. **Refresh the page**, and you are fully protected!

### 🎯 Matching Modes

- 🟢 **Whitelist Mode (Recommended)**: Only applies spoofing to domains you explicitly choose (e.g. Claude, OpenAI, overseas portals). Domestic websites remain untouched.
- 🌐 **Global Mode**: Spoofs your fingerprint on all visited websites.
- 🔴 **Blacklist Mode**: Spoofs all websites except those on your exclusion list.

### 📦 Installation

#### Method 1: Direct Installation (Recommended)

1. Download the latest `VanishMe-v1.2.0.zip` from [Releases](https://github.com/XiNian-dada/VanishMe/releases).
2. Unzip the file to extract the `dist` folder.
3. Open Chrome or Edge and navigate to:
   - **Edge**: `edge://extensions/`
   - **Chrome**: `chrome://extensions/`
4. Turn on **"Developer mode"** in the top-right corner.
5. Click **"Load unpacked"** and select the extracted `dist` folder.

#### Method 2: Build from Source

```bash
git clone https://github.com/XiNian-dada/VanishMe.git
cd VanishMe
npm install
npm run build
# The compiled extension will be in the dist/ folder
```

---

## 📈 Star 历史趋势 / Star History

<div align="center">

<a href="https://star-history.com/#XiNian-dada/VanishMe&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=XiNian-dada/VanishMe&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=XiNian-dada/VanishMe&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=XiNian-dada/VanishMe&type=Date" width="100%" />
 </picture>
</a>

</div>

---

**学 AI 上 LinuxDo: [https://linux.do/](https://linux.do/)** / **Learn AI at LinuxDo: [https://linux.do/](https://linux.do/)**
