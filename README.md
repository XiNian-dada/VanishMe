<div align="center">

<img src="images/banner-zh.png" alt="VanishMe Banner" width="100%"/>

# VanishMe · 消失的我 🥷
### 专业级浏览器指纹伪装与反风控利器，让你的环境天衣无缝

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome / Edge](https://img.shields.io/badge/Browser-Chrome%20%7C%20Edge-blue.svg)](https://www.google.com/chrome/)
[![Version: 1.1.3](https://img.shields.io/badge/Version-1.1.3-brightgreen.svg)](https://github.com/XiNian-dada/VanishMe/releases)

[中文说明](#-为什么需要-vanishme) | [English Documentation](#english)

</div>

---

## 💡 为什么需要 VanishMe？

你是否遇到过这样的情况：
- **明明挂了海外代理**，打开 Claude、ChatGPT 或海外网站，却依然弹出**“当前地区不可用”**或直接触发封号？
- 登录某些电商、社交平台时，总是频繁跳出**风控验证码**或被标记为异常风险账号？

这是因为现代网站不仅看你的 IP 地址，更会**深度探测你的浏览器底层指纹**：
1. **时区露馅**：代理在美西洛杉矶（UTC-8），浏览器时区却暴露了中国标准时间（UTC+8）。
2. **语言泄露**：系统语言虽然调成了英文，但 JavaScript 底层 API（如 `Intl`）仍会悄悄出卖你的真实语言环境（`zh-CN`）。
3. **WebRTC 穿透**：网页通过 WebRTC 协议直接绕过代理，获取到了你的局域网内网或真实 IP。
4. **劣质插件反被识破**：许多修改指纹的插件由于实现简陋、直接覆写原生方法，反而被检测系统打上“使用自动化工具/恶意篡改”的高危标签。

👉 **VanishMe 就是为了彻底解决上述痛点而生。**

---

## 🌟 核心优势（v1.1.3 最新特性）

- 💯 **权威检测 100% 满分**：实测完美通过 [BrowserScan](https://www.browserscan.net/)、[BrowserLeaks](https://browserleaks.com/)、[iprisk.top](https://iprisk.top/) 等行业权威指纹检测。
- 🛡️ **专克大模型与严苛风控**：彻底封堵 `Intl.DateTimeFormat`、`Accept-Language` 请求头等隐蔽泄露点，告别 Claude / OpenAI 针对特定地区的语言与指纹封锁。
- 🔄 **网络层与 JS 底层“表里如一”**：修改语言和时区时，不仅前端 JS 呈现目标地区格式，发往网站的 HTTP 请求头（Declarative Net Request）也自动同步修改，绝不自相矛盾。
- 🥷 **真正的“原生级无痕隐身”**：伪装后的 API 均具备真实的 `[native code]` 签名与完整原型链，不破坏 Vue、React 等现代前端框架，网站绝无可能察觉插件存在。
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

1. 前往 [Releases 发布页](https://github.com/XiNian-dada/VanishMe/releases) 下载最新版本的 `vanishme-v1.1.3.zip`。
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
[![Version: 1.1.3](https://img.shields.io/badge/Version-1.1.3-brightgreen.svg)](https://github.com/XiNian-dada/VanishMe/releases)

</div>

### 💡 Why VanishMe?

Have you ever encountered these issues:
- Even when using a high-quality proxy, services like Claude, ChatGPT, or regional websites still prompt **"Service not available in your region"** or flag your account?
- Frequent CAPTCHAs or suspicious activity verification on overseas platforms?

Modern platforms do not merely inspect your IP address — they deeply inspect your **underlying browser fingerprint**:
1. **Timezone Discrepancies**: Your proxy is in Los Angeles (UTC-8), but your browser reveals your local timezone (e.g. UTC+8).
2. **Language & Intl Leakage**: Even if you change the UI language, JavaScript APIs like `Intl` still reveal your underlying OS locale.
3. **WebRTC Leakage**: WebRTC can bypass proxies and expose your true local IP.
4. **Poorly Made Extensions Get Detected**: Many spoofing extensions clumsily overwrite native functions, triggering "bot / tamper detected" security flags.

👉 **VanishMe is designed to solve all of these issues seamlessly.**

### 🌟 Core Highlights (v1.1.3)

- 💯 **100% Score on Fingerprint Checkers**: Passes [BrowserScan](https://www.browserscan.net/), [BrowserLeaks](https://browserleaks.com/), and [iprisk.top](https://iprisk.top/) with authentic native ratings.
- 🛡️ **Bypasses Strict AI & Service Geofencing**: Resolves hidden leaks in `Intl.DateTimeFormat`, `Intl.NumberFormat`, and `Accept-Language` headers targeted by AI platforms.
- 🔄 **Network & Client Synchronization**: Keeps HTTP request headers (`Accept-Language`) in 100% sync with in-page JavaScript APIs via Declarative Net Request.
- 🥷 **True Native Invisibility**: All hooked APIs maintain genuine `[native code]` signatures and intact prototype chains without breaking modern web frameworks (Vue, React).
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

1. Download the latest `vanishme-v1.1.3.zip` from [Releases](https://github.com/XiNian-dada/VanishMe/releases).
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

**Learn AI at LinuxDo: [https://linux.do/](https://linux.do/)**
