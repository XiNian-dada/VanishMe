export type RiskStatus = 'pass' | 'warn' | 'fail' | 'info';

export interface CheckItem {
  id: string;
  name: string;
  category: 'claude' | 'network' | 'fingerprint' | 'antidetect' | 'geolocation';
  status: RiskStatus;
  actualValue: string;
  expectedValue?: string;
  riskDescription?: string;
  recommendation?: string;
}

export interface AuditSummary {
  privacyScore: number; // 0 - 100
  claudeRiskScore: number; // 0 - 100 (越低越安全)
  claudeStatus: 'safe' | 'suspicious' | 'critical';
  antiDetectScore: number; // 0 - 100 (越高越好)
  antiDetectStatus: 'stealth' | 'suspicious' | 'detected';
  ipWebRTCStatus: 'secure' | 'warning' | 'leaking';
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  failedChecks: number;
}

export interface IpGeoInfo {
  ip: string;
  version?: 'IPv4' | 'IPv6';
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  asn?: string;
  org?: string;
  ipType?: 'Residential' | 'DataCenter / Cloud' | 'Mobile' | 'Unknown';
  error?: string;
}

export interface WebRTCLeakResult {
  supported: boolean;
  localIps: string[];
  publicIps: string[];
  candidates: string[];
  hasLeak: boolean;
  hasLocalLeak: boolean;
  statusMessage: string;
}

export interface FingerprintResult {
  canvasHash: string;
  canvasNoise: 'stable' | 'spoofed_noise' | 'unsupported';
  webglVendor: string;
  webglRenderer: string;
  webglUnmaskedVendor: string;
  webglUnmaskedRenderer: string;
  webglCompatibility: 'consistent' | 'mismatch' | 'unsupported';
  audioHash: string;
  hardwareConcurrency: number | string;
  deviceMemory: number | string;
  maxTouchPoints: number;
  screenResolution: string;
  availResolution: string;
  colorDepth: number;
  pixelRatio: number;
  webdriver: boolean;
  clientHintsMatch: boolean;
  platform: string;
  userAgent: string;
}

export interface ChineseLeakResult {
  timezoneLeaked: boolean;
  timezoneValue: string;
  offsetLeaked: boolean;
  offsetValue: number;
  dateStringLeaked: boolean;
  dateStringValue: string;
  languageLeaked: boolean;
  languageValue: string;
  languagesLeaked: boolean;
  languagesValue: string[];
  intlLocaleLeaked: boolean;
  intlLocaleValue: string;
  intlFormatLeaked: boolean;
  chineseFontsDetected: string[];
  chineseFontsMasked: string[];
  chineseVoicesDetected: string[];
  geoInChina: boolean;
  geoCoords?: { lat: number; lon: number };
  totalRiskPoints: number;
  summary: string;
}

export interface AntiDetectAuditResult {
  toStringChecks: { name: string; passed: boolean; details: string }[];
  descriptorChecks: { name: string; passed: boolean; details: string }[];
  prototypeChecks: { name: string; passed: boolean; details: string }[];
  iframeBypassChecks: { name: string; passed: boolean; details: string }[];
  stackLeakChecks: { name: string; passed: boolean; details: string }[];
  overallStealth: 'native_grade' | 'minor_anomaly' | 'compromised';
}

export interface EnvironmentSnapshot {
  timezone: string;
  timezoneOffset: number;
  dateString: string;
  language: string;
  languages: string[];
  intlLocale: string;
  platform: string;
  userAgent: string;
  chineseFontsCount: number;
  geolocationAvailable: boolean;
}
