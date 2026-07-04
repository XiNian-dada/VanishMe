export const DEFAULT_PROFILES = [
    {
        id: 'singapore',
        name: 'Singapore',
        description: 'Singapore environment',
        geolocation: {
            latitude: 1.3521,
            longitude: 103.8198,
            accuracy: 50
        },
        language: {
            language: 'en-SG',
            languages: ['en-SG', 'en-US', 'en'],
            acceptLanguage: 'en-SG,en-US;q=0.9,en;q=0.8'
        },
        timezone: {
            timezone: 'Asia/Singapore',
            offsetMinutes: -480
        }
    },
    {
        id: 'japan',
        name: 'Japan',
        description: 'Japan environment',
        geolocation: {
            latitude: 35.6895,
            longitude: 139.6917,
            accuracy: 50
        },
        language: {
            language: 'ja-JP',
            languages: ['ja-JP', 'ja', 'en-US', 'en'],
            acceptLanguage: 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timezone: {
            timezone: 'Asia/Tokyo',
            offsetMinutes: -540
        }
    },
    {
        id: 'germany',
        name: 'Germany',
        description: 'Germany environment',
        geolocation: {
            latitude: 52.5200,
            longitude: 13.4050,
            accuracy: 50
        },
        language: {
            language: 'de-DE',
            languages: ['de-DE', 'de', 'en-US', 'en'],
            acceptLanguage: 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timezone: {
            timezone: 'Europe/Berlin',
            offsetMinutes: -60
        }
    },
    {
        id: 'united-states',
        name: 'United States',
        description: 'United States environment',
        geolocation: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 50
        },
        language: {
            language: 'en-US',
            languages: ['en-US', 'en'],
            acceptLanguage: 'en-US,en;q=0.9'
        },
        timezone: {
            timezone: 'America/New_York',
            offsetMinutes: 300
        }
    },
    {
        id: 'china',
        name: 'China',
        description: 'China environment',
        geolocation: {
            latitude: 31.2304,
            longitude: 121.4737,
            accuracy: 50
        },
        language: {
            language: 'zh-CN',
            languages: ['zh-CN', 'zh', 'en-US', 'en'],
            acceptLanguage: 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timezone: {
            timezone: 'Asia/Shanghai',
            offsetMinutes: -480
        }
    }
];
export const DEFAULT_CONFIG = {
    globalEnabled: true,
    debugMode: false, // 默认关闭调试日志
    matchMode: 'whitelist', // 默认使用白名单模式
    domainList: [
        // AI 网站
        'chatgpt.com',
        '*.openai.com',
        'claude.ai',
        '*.anthropic.com',
        'gemini.google.com',
        'copilot.microsoft.com',
        // 搜索引擎
        'google.com',
        '*.google.com',
        'bing.com',
        '*.bing.com',
        // 社交媒体
        'twitter.com',
        '*.twitter.com',
        'x.com',
        '*.x.com',
        'facebook.com',
        '*.facebook.com',
        'instagram.com',
        '*.instagram.com',
        'tiktok.com',
        '*.tiktok.com',
        // 视频平台
        'youtube.com',
        '*.youtube.com',
        'netflix.com',
        '*.netflix.com',
        // 其他常见需要伪装的网站
        'reddit.com',
        '*.reddit.com',
        'linkedin.com',
        '*.linkedin.com'
    ],
    siteRules: {},
    geolocation: {
        enabled: true,
        latitude: 1.3521,
        longitude: 103.8198,
        accuracy: 50,
        randomize: false,
        randomRadiusMeters: 1000,
        spoofPermission: true,
        history: []
    },
    webrtc: {
        enabled: true,
        policy: 'disable_non_proxied_udp'
    },
    language: {
        enabled: true,
        language: 'en-SG',
        languages: ['en-SG', 'en-US', 'en'],
        acceptLanguage: 'en-SG,en-US;q=0.9,en;q=0.8'
    },
    timezone: {
        enabled: true,
        timezone: 'Asia/Singapore',
        offsetMinutes: -480
    },
    canvas: {
        enabled: false, // 默认关闭，需要用户手动启用
        spoofFonts: true,
        targetFonts: [
            // Windows 简体中文字体
            'Microsoft YaHei', 'Microsoft YaHei UI', 'SimSun', 'NSimSun', 'SimHei',
            'KaiTi', 'FangSong', 'DengXian',
            // macOS 简体中文字体
            'PingFang SC', 'Hiragino Sans GB', 'STHeiti', 'STSong', 'Songti SC',
            // 开源简体中文字体
            'Source Han Sans CN', 'Source Han Sans SC',
            'Noto Sans CJK SC', 'Noto Serif CJK SC',
            'WenQuanYi Micro Hei', 'WenQuanYi Zen Hei',
            // 繁体中文字体
            'Microsoft JhengHei', 'PMingLiU', 'MingLiU', 'DFKai-SB',
            'PingFang TC', 'PingFang HK', 'Source Han Sans TW', 'Noto Sans CJK TC'
        ]
    },
    profile: {
        activeProfileId: 'singapore',
        profiles: DEFAULT_PROFILES
    }
};
