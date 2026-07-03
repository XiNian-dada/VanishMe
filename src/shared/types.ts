export interface GeolocationHistory {
  latitude: number;
  longitude: number;
  accuracy: number;
  label?: string;
  createdAt: number;
}

export interface GeolocationConfig {
  enabled: boolean;
  latitude: number;
  longitude: number;
  accuracy: number;
  randomize: boolean;
  randomRadiusMeters: number;
  spoofPermission: boolean;
  history: GeolocationHistory[];
}

export interface WebRTCConfig {
  enabled: boolean;
  policy: 'default' | 'default_public_interface_only' | 'default_public_and_private_interfaces' | 'disable_non_proxied_udp';
}

export interface LanguageConfig {
  enabled: boolean;
  language: string;
  languages: string[];
  acceptLanguage: string;
}

export interface TimezoneConfig {
  enabled: boolean;
  timezone: string;
  offsetMinutes: number;
}

export interface CanvasConfig {
  enabled: boolean;
  spoofFonts: boolean;
  targetFonts: string[]; // 目标字体列表，如 ["Microsoft YaHei", "SimSun", "SimHei"]
}

export interface SiteRule {
  enabled: boolean;
}

export interface Profile {
  id: string;
  name: string;
  description?: string;
  geolocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  language: {
    language: string;
    languages: string[];
    acceptLanguage: string;
  };
  timezone: {
    timezone: string;
    offsetMinutes: number;
  };
}

export interface ProfileConfig {
  activeProfileId: string | null;
  profiles: Profile[];
}

export type MatchMode = 'global' | 'whitelist' | 'blacklist';

export interface PrivacyConfig {
  globalEnabled: boolean;
  matchMode: MatchMode; // 匹配模式：全局、白名单、黑名单
  domainList: string[]; // 域名列表（用于白名单或黑名单）
  siteRules: Record<string, SiteRule>;
  geolocation: GeolocationConfig;
  webrtc: WebRTCConfig;
  language: LanguageConfig;
  timezone: TimezoneConfig;
  canvas: CanvasConfig;
  profile: ProfileConfig;
}

export interface InjectedConfig {
  enabled: boolean;
  geolocation: GeolocationConfig;
  language: LanguageConfig;
  timezone: TimezoneConfig;
  canvas: CanvasConfig;
}
