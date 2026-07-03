# VanishMe

<div align="center">

**浏览器隐私保护扩展 - 伪装你的浏览器指纹**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://www.google.com/chrome/)

[English](#english) | [中文](#中文)

</div>

---

## 中文

VanishMe 是一个强大的浏览器隐私保护扩展，帮助你伪装浏览器指纹，避免被网站追踪。支持地理位置、时区、语言、WebRTC 等多维度的隐私保护。

### ✨ 核心特性

- 🌍 **地理位置伪装** - 自定义经纬度、精度、随机偏移
- 🕐 **时区伪装** - 修改浏览器时区和 UTC 偏移
- 🌐 **语言伪装** - 自定义 navigator.language 和 Accept-Language
- 🔒 **WebRTC 防泄漏** - 防止真实 IP 通过 WebRTC 泄漏
- 🎯 **灵活匹配模式** - 支持全局、白名单、黑名单三种模式
- ⚡ **快速配置卡片** - 内置新加坡、日本、德国、美国、中国等预设
- 💾 **配置管理** - 支持自定义配置文件，导入导出分享
- 🛡️ **深度反检测** - 隐藏 API 修改痕迹，通过指纹检测网站

### 🚀 安装

#### 从 Release 安装

1. 前往 [Releases](https://github.com/XiNian-dada/VanishMe/releases) 下载最新的 `vanishme-v*.*.*.zip`
2. 解压缩文件
3. 打开 Chrome 浏览器，进入 `chrome://extensions/`
4. 启用右上角的"开发者模式"
5. 点击"加载已解压的扩展程序"，选择解压后的 `dist` 文件夹

#### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/XiNian-dada/VanishMe.git
cd VanishMe

# 安装依赖
npm install

# 构建扩展
npm run build

# dist 文件夹即为扩展文件
```

### 📖 使用指南

#### 快速开始

1. 点击扩展图标打开弹窗
2. 在"快速配置"中点击一个预设国家/地区卡片
3. 确认应用配置
4. 刷新页面，配置即时生效

#### 匹配模式

VanishMe 支持三种匹配模式，让你灵活控制哪些网站需要伪装：

- **全局模式** - 对所有网站启用伪装
- **白名单模式** - 仅对列表中的网站启用（推荐）
- **黑名单模式** - 对除列表外的所有网站启用

**通配符支持：**
- `chatgpt.com` - 精确匹配
- `*.google.com` - 匹配所有子域名（如 mail.google.com, drive.google.com）
- `*openai*` - 匹配包含 openai 的所有域名

#### 完整配置页面

点击弹窗右上角的 ⚙️ 设置图标，或右键扩展图标选择"选项"，进入完整配置页面：

- **当前配置** - 使用标签页编辑地理位置、时区、语言、WebRTC 详细设置
- **预设配置** - 快速应用内置国家/地区预设
- **自定义配置文件** - 保存、编辑、导出、删除自己的配置方案
- **站点特定规则** - 为特定网站设置例外（优先级最高）
- **数据管理** - 导入导出完整配置，重置所有数据

#### 当前网站快捷操作

在弹窗的"当前网站"区域：
- 点击"启用"将当前网站添加到白名单（或从黑名单移除）
- 点击"不启用"将当前网站添加到黑名单（或从白名单移除）
- 操作后自动刷新页面使配置生效

### 🔧 技术特点

- **Manifest V3** - 使用最新的 Chrome 扩展 API
- **MAIN World 注入** - 直接在主页面上下文中修改 API
- **深度反检测技术**：
  - 使用 Proxy 包装函数，保持原生调用行为
  - Function.toString() 返回原生代码字符串
  - Object.getOwnPropertyDescriptor 返回原始描述符
  - 提前保存原生 API 描述符，防止检测
- **无痕修改** - 通过指纹检测网站测试

### 🛡️ 隐私检测网站测试

VanishMe 能够通过以下指纹检测网站的测试：

- [iprisk.top](https://iprisk.top/) - 显示为原生 API
- [BrowserLeaks](https://browserleaks.com/)
- [IPLeak](https://ipleak.net/)
- [Device Info](https://www.deviceinfo.me/)

#### 使用前后对比

<table>
  <tr>
    <th>使用前 (Before)</th>
    <th>使用后 (After)</th>
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

可以看到，使用 VanishMe 后，所有 API 都显示为原生状态，完全隐藏了修改痕迹。

---

## English

VanishMe is a powerful browser privacy protection extension that helps you disguise your browser fingerprint and avoid tracking by websites. Supports multi-dimensional privacy protection including geolocation, timezone, language, WebRTC, and more.

### ✨ Core Features

- 🌍 **Geolocation Spoofing** - Custom latitude/longitude, accuracy, random offset
- 🕐 **Timezone Spoofing** - Modify browser timezone and UTC offset
- 🌐 **Language Spoofing** - Custom navigator.language and Accept-Language
- 🔒 **WebRTC Leak Protection** - Prevent real IP leakage through WebRTC
- 🎯 **Flexible Matching Modes** - Support global, whitelist, blacklist modes
- ⚡ **Quick Configuration Cards** - Built-in presets for Singapore, Japan, Germany, USA, China
- 💾 **Configuration Management** - Support custom profiles, import/export sharing
- 🛡️ **Deep Anti-Detection** - Hide API modification traces, pass fingerprint detection sites

### 🚀 Installation

#### From Release

1. Go to [Releases](https://github.com/XiNian-dada/VanishMe/releases) and download the latest `vanishme-v*.*.*.zip`
2. Extract the file
3. Open Chrome browser, go to `chrome://extensions/`
4. Enable "Developer mode" in the top right corner
5. Click "Load unpacked" and select the extracted `dist` folder

#### Build from Source

```bash
# Clone repository
git clone https://github.com/XiNian-dada/VanishMe.git
cd VanishMe

# Install dependencies
npm install

# Build extension
npm run build

# The dist folder is the extension
```

### 📖 Usage Guide

#### Quick Start

1. Click the extension icon to open popup
2. Click a preset country/region card in "Quick Configuration"
3. Confirm and apply configuration
4. Refresh the page, configuration takes effect immediately

#### Matching Modes

VanishMe supports three matching modes for flexible control over which sites need spoofing:

- **Global Mode** - Enable spoofing for all websites
- **Whitelist Mode** - Enable only for sites in the list (recommended)
- **Blacklist Mode** - Enable for all sites except those in the list

**Wildcard Support:**
- `chatgpt.com` - Exact match
- `*.google.com` - Match all subdomains (e.g., mail.google.com, drive.google.com)
- `*openai*` - Match all domains containing openai

#### Full Configuration Page

Click the ⚙️ settings icon in the popup top right, or right-click the extension icon and select "Options" to access the full configuration page:

- **Current Configuration** - Use tabs to edit geolocation, timezone, language, WebRTC detailed settings
- **Preset Configurations** - Quickly apply built-in country/region presets
- **Custom Profiles** - Save, edit, export, delete your own configuration schemes
- **Site-Specific Rules** - Set exceptions for specific websites (highest priority)
- **Data Management** - Import/export full configuration, reset all data

#### Current Site Quick Actions

In the popup "Current Site" area:
- Click "Enable" to add the current site to whitelist (or remove from blacklist)
- Click "Disable" to add the current site to blacklist (or remove from whitelist)
- Page automatically refreshes after operation to apply configuration

### 🔧 Technical Features

- **Manifest V3** - Uses latest Chrome extension API
- **MAIN World Injection** - Directly modify APIs in main page context
- **Deep Anti-Detection Technology**:
  - Use Proxy to wrap functions, maintain native call behavior
  - Function.toString() returns native code string
  - Object.getOwnPropertyDescriptor returns original descriptor
  - Pre-save native API descriptors to prevent detection
- **Traceless Modification** - Pass fingerprint detection site tests

### 🛡️ Privacy Detection Site Tests

VanishMe can pass tests from the following fingerprint detection sites:

- [iprisk.top](https://iprisk.top/) - Shows as native API
- [BrowserLeaks](https://browserleaks.com/)
- [IPLeak](https://ipleak.net/)
- [Device Info](https://www.deviceinfo.me/)

#### Before & After Comparison

<table>
  <tr>
    <th>Before</th>
    <th>After</th>
  </tr>
  <tr>
    <td><img src="images/before/detection-before-1.png" alt="Before 1" width="400"/></td>
    <td><img src="images/after/detection-after-1.png" alt="After 1" width="400"/></td>
  </tr>
  <tr>
    <td><img src="images/before/detection-before-2.png" alt="Before 2" width="400"/></td>
    <td><img src="images/after/detection-after-2.png" alt="After 2" width="400"/></td>
  </tr>
  <tr>
    <td><img src="images/before/detection-before-3.png" alt="Before 3" width="400"/></td>
    <td><img src="images/after/detection-after-3.png" alt="After 3" width="400"/></td>
  </tr>
</table>

As you can see, after using VanishMe, all APIs show as native, completely hiding modification traces.
