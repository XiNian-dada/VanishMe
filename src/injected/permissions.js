import { getOriginals } from './utils';
export function installPermissionsSpoof(config) {
    if (!config.enabled || !config.spoofPermission)
        return;
    const originals = getOriginals();
    if (!navigator.permissions) {
        return;
    }
    const originalQuery = originals.permissionsQuery || navigator.permissions.query;
    navigator.permissions.query = function (permissionDesc) {
        if (permissionDesc && permissionDesc.name === 'geolocation') {
            return Promise.resolve({
                state: 'granted',
                name: 'geolocation',
                onchange: null,
                addEventListener: function () { },
                removeEventListener: function () { },
                dispatchEvent: function () { return true; }
            });
        }
        return originalQuery.call(navigator.permissions, permissionDesc);
    };
}
