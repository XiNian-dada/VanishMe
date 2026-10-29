import type { CheckItem, IpGeoInfo, WebRTCLeakResult } from './types';

/**
 * 获取当前出口公网 IP 及地理位置详细信息 (多线路 Fallback)
 */
export async function fetchPublicIpInfo(): Promise<IpGeoInfo> {
  const timeoutMs = 4500;

  // 辅助超时函数
  const fetchWithTimeout = async (url: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // 线路 1: ipapi.co (数据最完整，含城市、时区、经纬度、ASN)
  try {
    const data = await fetchWithTimeout('https://ipapi.co/json/');
    if (data && data.ip && !data.error) {
      let ipType: 'Residential' | 'DataCenter / Cloud' | 'Mobile' | 'Unknown' = 'Unknown';
      const orgLower = (data.org || '').toLowerCase();
      if (
        orgLower.includes('cloud') ||
        orgLower.includes('amazon') ||
        orgLower.includes('digitalocean') ||
        orgLower.includes('microsoft') ||
        orgLower.includes('google') ||
        orgLower.includes('oracle') ||
        orgLower.includes('ovh') ||
        orgLower.includes('vultr') ||
        orgLower.includes('linode') ||
        orgLower.includes('alibaba') ||
        orgLower.includes('tencent') ||
        orgLower.includes('data center') ||
        orgLower.includes('hosting')
      ) {
        ipType = 'DataCenter / Cloud';
      } else {
        ipType = 'Residential';
      }

      return {
        ip: data.ip,
        version: data.ip.includes(':') ? 'IPv6' : 'IPv4',
        country: data.country_name,
        countryCode: data.country_code,
        city: data.city,
        region: data.region,
        latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
        longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
        timezone: data.timezone,
        asn: data.asn,
        org: data.org,
        ipType
      };
    }
  } catch {}

  // 线路 2: ipwho.is
  try {
    const data = await fetchWithTimeout('https://ipwho.is/');
    if (data && data.success && data.ip) {
      return {
        ip: data.ip,
        version: data.ip.includes(':') ? 'IPv6' : 'IPv4',
        country: data.country,
        countryCode: data.country_code,
        city: data.city,
        region: data.region,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone?.id,
        asn: data.connection?.asn ? `AS${data.connection.asn}` : undefined,
        org: data.connection?.org || data.connection?.isp,
        ipType: data.connection?.hosting ? 'DataCenter / Cloud' : 'Residential'
      };
    }
  } catch {}

  // 线路 3: Cloudflare 追踪 (超快速保底)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch('https://1.1.1.1/cdn-cgi/trace', { signal: controller.signal });
    clearTimeout(timeoutId);
    const text = await resp.text();
    const lines = text.split('\n');
    const data: Record<string, string> = {};
    for (const line of lines) {
      const [k, v] = line.split('=');
      if (k && v) data[k.trim()] = v.trim();
    }
    if (data.ip) {
      return {
        ip: data.ip,
        version: data.ip.includes(':') ? 'IPv6' : 'IPv4',
        countryCode: data.loc,
        country: data.loc,
        ipType: 'Unknown'
      };
    }
  } catch {}

  // 离线或完全阻塞保底
  return {
    ip: 'Offline / Blocked',
    error: '无法获取外网 IP，网络可能离线或被策略拦截'
  };
}

/**
 * 严格执行 WebRTC STUN 穿透与 IP 泄漏检测 (iplark / browserscan 规范)
 */
export async function testWebRTCLeak(): Promise<WebRTCLeakResult> {
  if (typeof window === 'undefined' || !window.RTCPeerConnection) {
    return {
      supported: false,
      localIps: [],
      publicIps: [],
      candidates: [],
      hasLeak: false,
      hasLocalLeak: false,
      statusMessage: '当前环境不支持 RTCPeerConnection (已完全防护或浏览器已禁用)'
    };
  }

  const stunServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ];

  const localIps = new Set<string>();
  const publicIps = new Set<string>();
  const allCandidates: string[] = [];

  const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/gi;

  const isPrivateIp = (ip: string): boolean => {
    return (
      /^10\./.test(ip) ||
      /^192\.168\./.test(ip) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
      /^127\./.test(ip) ||
      /^169\.254\./.test(ip) ||
      /\.local$/i.test(ip)
    );
  };

  return new Promise<WebRTCLeakResult>((resolve) => {
    let pc: RTCPeerConnection | null = null;
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      if (pc) {
        try {
          pc.close();
        } catch {}
      }

      const localList = Array.from(localIps);
      const publicList = Array.from(publicIps);
      const hasLocalLeak = localList.length > 0;
      const hasLeak = publicList.length > 0 || hasLocalLeak;

      let statusMessage = '🛡️ WebRTC 保护生效：未探测到任何穿透 Candidate';
      if (publicList.length > 0) {
        statusMessage = `⚠️ WebRTC 泄露公网 Candidate: [${publicList.join(', ')}]`;
      } else if (hasLocalLeak) {
        statusMessage = `⚠️ WebRTC 泄露内网/mDNS IP: [${localList.join(', ')}]`;
      }

      resolve({
        supported: true,
        localIps: localList,
        publicIps: publicList,
        candidates: allCandidates,
        hasLeak,
        hasLocalLeak,
        statusMessage
      });
    };

    // 3.5秒超时强行收尾
    const timer = setTimeout(cleanup, 3500);

    try {
      pc = new RTCPeerConnection({
        iceServers: stunServers
      });

      pc.onicecandidate = (event) => {
        if (!event.candidate || !event.candidate.candidate) {
          // 协商完成
          clearTimeout(timer);
          cleanup();
          return;
        }

        const cand = event.candidate.candidate;
        allCandidates.push(cand);

        const matches = cand.match(ipRegex);
        if (matches) {
          for (const ip of matches) {
            if (isPrivateIp(ip)) {
              localIps.add(ip);
            } else {
              publicIps.add(ip);
            }
          }
        }
      };

      pc.createDataChannel('vm_leak_probe');
      pc.createOffer()
        .then((offer) => pc!.setLocalDescription(offer))
        .catch(() => cleanup());
    } catch {
      cleanup();
    }
  });
}

/**
 * 计算两个经纬度之间的地球表面距离 (Haversine 公式，单位：公里)
 */
export function calculateGeoDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 地球平均半径 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * 汇总网络与 IP 风险排查检查项
 */
export function evaluateNetworkRisks(
  ipInfo: IpGeoInfo,
  webrtcResult: WebRTCLeakResult,
  targetWin: any = typeof window !== 'undefined' ? window : null,
  geoCoords?: { latitude: number; longitude: number }
): CheckItem[] {
  const checks: CheckItem[] = [];

  // 1. 出口 IP 状态
  if (ipInfo.error || ipInfo.ip === 'Offline / Blocked') {
    checks.push({
      id: 'net-ip',
      name: '公网出口 IP 连通性',
      category: 'network',
      status: 'warn',
      actualValue: ipInfo.error || '离线',
      expectedValue: '正常海外出口 IP',
      riskDescription: '无法探查出口公网 IP，可能处于纯离线沙盒或外网受阻'
    });
  } else {
    checks.push({
      id: 'net-ip',
      name: '公网出口 IP & 归属地',
      category: 'network',
      status: ipInfo.countryCode === 'CN' ? 'fail' : 'pass',
      actualValue: `${ipInfo.ip} (${ipInfo.country || ipInfo.countryCode || '未知'})`,
      expectedValue: '海外代理 IP (如 US / SG / JP)',
      riskDescription:
        ipInfo.countryCode === 'CN'
          ? '公网出口 IP 位于中国大陆，直接被 AI 网站拒绝'
          : '出口 IP 位于海外'
    });
  }

  // 2. IP 运营商与机房类型 (iprisk 核心指标)
  if (ipInfo.org || ipInfo.asn) {
    const isHosting = ipInfo.ipType === 'DataCenter / Cloud';
    checks.push({
      id: 'net-org',
      name: 'IP 类型与运营商 (ISP/ASN)',
      category: 'network',
      status: isHosting ? 'warn' : 'pass',
      actualValue: `${ipInfo.org || ipInfo.asn} [${ipInfo.ipType}]`,
      expectedValue: '住宅宽带 (Residential IP)',
      riskDescription: isHosting
        ? '机房/云服务商 IP (DataCenter/Cloud)，在 iprisk / Cloudflare 中风险系数高于家庭住宅宽带'
        : '住宅宽带 IP，风控信誉度良好'
    });
  }

  // 3. WebRTC 穿透与真实 IP 泄露 (含中国大陆运营商 IPv6 穿透探测)
  const hasChineseIpv6 =
    webrtcResult.publicIps.some((p) => /^(240e|2408|2409|2001:da8):/i.test(p)) ||
    webrtcResult.candidates.some((c) => /(240e|2408|2409|2001:da8):/i.test(c));

  if (hasChineseIpv6) {
    checks.push({
      id: 'net-webrtc',
      name: 'WebRTC STUN 穿透泄露检测 (中国大陆 IPv6 穿透)',
      category: 'network',
      status: 'fail',
      actualValue: `🚨 致命高危！探测到中国大陆电信/联通/移动物理 IPv6 Candidate!`,
      expectedValue: '0 物理网络特征暴露',
      riskDescription: 'WebRTC 绕过系统代理直接暴露了真实的中国大陆运营商 IPv6 地址 (240e/2408/2409)，AI 网站一秒识别宿主位置！',
      recommendation: '确保在代理软件中禁用 IPv6，并在 VanishMe 中开启 WebRTC 严格拦截模式'
    });
  } else if (webrtcResult.publicIps.length > 0) {
    const leakedNotMatching = webrtcResult.publicIps.some((p) => p !== ipInfo.ip);
    checks.push({
      id: 'net-webrtc',
      name: 'WebRTC STUN 穿透泄露检测',
      category: 'network',
      status: leakedNotMatching ? 'fail' : 'warn',
      actualValue: `探测到公网 Candidate: ${webrtcResult.publicIps.join(', ')}`,
      expectedValue: '无泄露或受策略保护',
      riskDescription: leakedNotMatching
        ? '严重致命泄露！WebRTC 穿透出与 HTTP 出口不同的真实物理公网 IP！代理被直接绕过！'
        : 'WebRTC 暴露了出口 IP',
      recommendation: '确保 VanishMe 的 WebRTC 策略配置为 disable_non_proxied_udp'
    });
  } else if (webrtcResult.hasLocalLeak) {
    checks.push({
      id: 'net-webrtc',
      name: 'WebRTC 局域网 IP (host candidate)',
      category: 'network',
      status: 'warn',
      actualValue: `暴露局域网标识: ${webrtcResult.localIps.join(', ')}`,
      expectedValue: '无 Candidate 泄露',
      riskDescription: '暴露了内网 IP 或 mDNS 地址，可被用于设备关联追踪',
      recommendation: '开启 VanishMe WebRTC 严格防护'
    });
  } else {
    checks.push({
      id: 'net-webrtc',
      name: 'WebRTC STUN 穿透泄露检测',
      category: 'network',
      status: 'pass',
      actualValue: '🛡️ 完美防御 (未暴露任何公网/内网候选)',
      expectedValue: '无泄露',
      riskDescription: 'WebRTC 穿透已被严格阻断'
    });
  }

  // 4. IP 经纬度与 Geolocation 伪装经纬度一致性
  if (
    geoCoords &&
    typeof ipInfo.latitude === 'number' &&
    typeof ipInfo.longitude === 'number'
  ) {
    const distKm = calculateGeoDistanceKm(
      ipInfo.latitude,
      ipInfo.longitude,
      geoCoords.latitude,
      geoCoords.longitude
    );

    if (distKm > 1000) {
      checks.push({
        id: 'net-geo-dist',
        name: 'IP 物理定位 vs 浏览器 Geolocation 距离偏差',
        category: 'network',
        status: distKm > 3000 ? 'fail' : 'warn',
        actualValue: `相差 ${distKm} km (IP 经纬度: ${ipInfo.latitude.toFixed(2)}, ${ipInfo.longitude.toFixed(2)})`,
        expectedValue: '偏差 < 500 km',
        riskDescription: `浏览器上报的 GPS 定位与出口 IP 地理位置相距 ${distKm} 公里，商业风控系统（iprisk）会标记位置欺诈异常！`,
        recommendation: '在 VanishMe 中开启【自动同步出口 IP 位置】或手动将坐标调整为 IP 所在城市'
      });
    } else {
      checks.push({
        id: 'net-geo-dist',
        name: 'IP 物理定位 vs 浏览器 Geolocation 距离偏差',
        category: 'network',
        status: 'pass',
        actualValue: `相距 ${distKm} km (在合理同城/同区域范围)`,
        expectedValue: '相距 < 1000 km',
        riskDescription: 'GPS 坐标与 IP 地理位置高度吻合'
      });
    }
  }

  return checks;
}
