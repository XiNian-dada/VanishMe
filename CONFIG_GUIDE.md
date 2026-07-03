# VanishMe 配置建议 - 匹配美国加州 IP

根据你的 IP 地址 192.220.23.170（洛杉矶），建议使用以下配置：

## 在 VanishMe Popup 中设置：

### 1. Geolocation（地理位置）
- ✅ Enabled
- Latitude: **34.0522**（洛杉矶实际坐标）
- Longitude: **-118.2437**
- Accuracy: **50**
- Randomize: **关闭**（或打开，半径设小一点，比如 100-500m）
- Spoof Permission: **开启**

### 2. Timezone（时区）
- ✅ Enabled
- Timezone: **America/Los_Angeles**（必须改！）
- Offset Minutes: **420**（夏令时 UTC-7）或 **480**（冬令时 UTC-8）
  - 现在7月是夏令时，用 **420**

### 3. Language（语言）
- ✅ Enabled
- Language: **en-US**
- Languages: **en-US, en**（不要包含中文）
- Accept-Language: **en-US,en;q=0.9**

### 4. WebRTC
- ✅ Enabled
- Policy: **disable_non_proxied_udp**（已经设置正确）

## 操作步骤：

1. 打开 VanishMe 扩展
2. **不要用 Singapore profile**，选择 "United States"
3. 修改经纬度到上面的数值
4. **重点：改时区为 America/Los_Angeles，offset 改为 420**
5. 语言全部改成英文
6. 点击 Save
7. 关闭所有标签页
8. 重新打开 BrowserScan 测试

## 为什么会不一致？

- 你现在用的是 Singapore profile（时区 Asia/Singapore）
- 但你的 VPN/代理 IP 在美国
- 网站检测到矛盾，导致指纹真实度降低

## 修复后应该达到：

- ✅ 时区匹配 IP
- ✅ 语言统一英文
- ✅ 地理位置与 IP 一致
- 目标指纹真实度：90%+
