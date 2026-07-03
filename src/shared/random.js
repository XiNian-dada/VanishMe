/**
 * Generate random coordinate within radius
 * Uses proper geographic calculation
 */
export function randomCoordinateInRadius(lat, lon, radiusMeters) {
    if (radiusMeters <= 0) {
        return { latitude: lat, longitude: lon };
    }
    // Earth radius in meters
    const earthRadius = 6371000;
    // Random distance and bearing
    const distance = Math.random() * radiusMeters;
    const bearing = Math.random() * 2 * Math.PI;
    // Convert to radians
    const lat1 = (lat * Math.PI) / 180;
    const lon1 = (lon * Math.PI) / 180;
    // Calculate new position
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / earthRadius) +
        Math.cos(lat1) * Math.sin(distance / earthRadius) * Math.cos(bearing));
    const lon2 = lon1 +
        Math.atan2(Math.sin(bearing) * Math.sin(distance / earthRadius) * Math.cos(lat1), Math.cos(distance / earthRadius) - Math.sin(lat1) * Math.sin(lat2));
    // Convert back to degrees
    const newLat = (lat2 * 180) / Math.PI;
    const newLon = (lon2 * 180) / Math.PI;
    // Clamp values
    return {
        latitude: Math.max(-90, Math.min(90, newLat)),
        longitude: ((newLon + 540) % 360) - 180 // Normalize to -180 to 180
    };
}
