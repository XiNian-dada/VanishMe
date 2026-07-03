import { DEFAULT_PROFILES } from './defaults';
export function validateProfile(profile) {
    if (!profile.id || !profile.name)
        return false;
    if (!profile.geolocation)
        return false;
    const { latitude, longitude, accuracy } = profile.geolocation;
    if (latitude < -90 || latitude > 90)
        return false;
    if (longitude < -180 || longitude > 180)
        return false;
    if (accuracy <= 0)
        return false;
    if (!profile.language)
        return false;
    if (!profile.language.language || !Array.isArray(profile.language.languages))
        return false;
    if (!profile.timezone)
        return false;
    if (!profile.timezone.timezone)
        return false;
    if (profile.timezone.offsetMinutes < -840 || profile.timezone.offsetMinutes > 720)
        return false;
    return true;
}
export function applyProfileToConfig(config, profileId) {
    const profile = [...DEFAULT_PROFILES, ...config.profile.profiles].find(p => p.id === profileId);
    if (!profile) {
        return config;
    }
    return {
        ...config,
        geolocation: {
            ...config.geolocation,
            latitude: profile.geolocation.latitude,
            longitude: profile.geolocation.longitude,
            accuracy: profile.geolocation.accuracy
        },
        language: {
            ...config.language,
            language: profile.language.language,
            languages: profile.language.languages,
            acceptLanguage: profile.language.acceptLanguage
        },
        timezone: {
            ...config.timezone,
            timezone: profile.timezone.timezone,
            offsetMinutes: profile.timezone.offsetMinutes
        },
        profile: {
            ...config.profile,
            activeProfileId: profileId
        }
    };
}
export { DEFAULT_PROFILES };
