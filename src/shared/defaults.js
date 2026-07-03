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
    profile: {
        activeProfileId: 'singapore',
        profiles: DEFAULT_PROFILES
    }
};
