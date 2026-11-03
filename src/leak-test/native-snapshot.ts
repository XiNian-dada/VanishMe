// 捕获真实底层原生环境快照（在任何伪装脚本执行前以独立脚本形式运行，避免 Manifest V3 CSP 拦截内联代码）
(function() {
  (window as any).__VM_NATIVE_SNAPSHOT__ = {
    timezone: (function() {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
      } catch {
        return 'Unknown';
      }
    })(),
    timezoneOffset: new Date().getTimezoneOffset(),
    dateString: new Date().toString(),
    language: navigator.language || 'N/A',
    languages: navigator.languages ? Array.from(navigator.languages) : [],
    intlLocale: (function() {
      try {
        return new Intl.DateTimeFormat().resolvedOptions().locale || 'N/A';
      } catch {
        return 'N/A';
      }
    })(),
    platform: navigator.platform || 'N/A',
    userAgent: navigator.userAgent || 'N/A',
    geolocationAvailable: Boolean(navigator.geolocation)
  };
})();
