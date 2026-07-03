import './leak-test.css';
// Geolocation elements
const geolocationExistsEl = document.getElementById('geolocationExists');
const geolocationResultEl = document.getElementById('geolocationResult');
const latitudeEl = document.getElementById('latitude');
const longitudeEl = document.getElementById('longitude');
const accuracyEl = document.getElementById('accuracy');
const geolocationPermissionEl = document.getElementById('geolocationPermission');
const testGeolocationBtn = document.getElementById('testGeolocation');
const testWatchPositionBtn = document.getElementById('testWatchPosition');
// Language elements
const navigatorLanguageEl = document.getElementById('navigatorLanguage');
const navigatorLanguagesEl = document.getElementById('navigatorLanguages');
const intlLocaleEl = document.getElementById('intlLocale');
// Timezone elements
const intlTimezoneEl = document.getElementById('intlTimezone');
const timezoneOffsetEl = document.getElementById('timezoneOffset');
const dateToStringEl = document.getElementById('dateToString');
const dateToLocaleStringEl = document.getElementById('dateToLocaleString');
// WebRTC elements
const rtcExistsEl = document.getElementById('rtcExists');
const iceCandidatesEl = document.getElementById('iceCandidates');
const testWebRTCBtn = document.getElementById('testWebRTC');
// Navigator elements
const platformEl = document.getElementById('platform');
const hardwareConcurrencyEl = document.getElementById('hardwareConcurrency');
const deviceMemoryEl = document.getElementById('deviceMemory');
const userAgentEl = document.getElementById('userAgent');
const screenSizeEl = document.getElementById('screenSize');
const colorDepthEl = document.getElementById('colorDepth');
const devicePixelRatioEl = document.getElementById('devicePixelRatio');
function initialize() {
    checkGeolocation();
    checkLanguage();
    checkTimezone();
    checkWebRTC();
    checkNavigator();
}
function checkGeolocation() {
    geolocationExistsEl.textContent = navigator.geolocation ? 'Yes' : 'No';
    if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
            geolocationPermissionEl.textContent = result.state;
        }).catch(() => {
            geolocationPermissionEl.textContent = 'N/A';
        });
    }
    else {
        geolocationPermissionEl.textContent = 'N/A';
    }
}
function testGeolocation() {
    if (!navigator.geolocation) {
        geolocationResultEl.textContent = 'Not available';
        return;
    }
    geolocationResultEl.textContent = 'Testing...';
    navigator.geolocation.getCurrentPosition((position) => {
        geolocationResultEl.textContent = 'Success';
        latitudeEl.textContent = position.coords.latitude.toString();
        longitudeEl.textContent = position.coords.longitude.toString();
        accuracyEl.textContent = `${position.coords.accuracy}m`;
    }, (error) => {
        geolocationResultEl.textContent = `Error: ${error.message}`;
        latitudeEl.textContent = 'N/A';
        longitudeEl.textContent = 'N/A';
        accuracyEl.textContent = 'N/A';
    });
}
let watchId = null;
function testWatchPosition() {
    if (!navigator.geolocation) {
        alert('Geolocation not available');
        return;
    }
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        testWatchPositionBtn.textContent = 'Test watchPosition';
        return;
    }
    let count = 0;
    watchId = navigator.geolocation.watchPosition((position) => {
        count++;
        geolocationResultEl.textContent = `watchPosition callback #${count}`;
        latitudeEl.textContent = position.coords.latitude.toString();
        longitudeEl.textContent = position.coords.longitude.toString();
        accuracyEl.textContent = `${position.coords.accuracy}m`;
    }, (error) => {
        geolocationResultEl.textContent = `Error: ${error.message}`;
    });
    testWatchPositionBtn.textContent = 'Stop watching';
}
function checkLanguage() {
    navigatorLanguageEl.textContent = navigator.language || 'N/A';
    navigatorLanguagesEl.textContent = navigator.languages ? navigator.languages.join(', ') : 'N/A';
    try {
        const locale = new Intl.DateTimeFormat().resolvedOptions().locale;
        intlLocaleEl.textContent = locale;
    }
    catch {
        intlLocaleEl.textContent = 'N/A';
    }
}
function checkTimezone() {
    try {
        const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
        intlTimezoneEl.textContent = timezone;
    }
    catch {
        intlTimezoneEl.textContent = 'N/A';
    }
    const offset = new Date().getTimezoneOffset();
    timezoneOffsetEl.textContent = `${offset} minutes (UTC${offset > 0 ? '-' : '+'}${Math.abs(offset / 60)})`;
    dateToStringEl.textContent = new Date().toString();
    dateToLocaleStringEl.textContent = new Date().toLocaleString();
}
function checkWebRTC() {
    rtcExistsEl.textContent = window.RTCPeerConnection ? 'Yes' : 'No';
}
async function testWebRTC() {
    if (!window.RTCPeerConnection) {
        iceCandidatesEl.textContent = 'Not available';
        return;
    }
    iceCandidatesEl.textContent = 'Testing...';
    try {
        const pc = new RTCPeerConnection({
            iceServers: []
        });
        const candidates = [];
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                candidates.push(event.candidate.candidate);
                iceCandidatesEl.textContent = candidates.length > 0
                    ? candidates.join(' | ')
                    : 'No candidates (protected)';
            }
            else {
                // Gathering complete
                if (candidates.length === 0) {
                    iceCandidatesEl.textContent = 'No candidates detected (protected)';
                }
            }
        };
        // Create offer to trigger ICE gathering
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        // Close after 3 seconds
        setTimeout(() => {
            pc.close();
        }, 3000);
    }
    catch (error) {
        iceCandidatesEl.textContent = `Error: ${error}`;
    }
}
function checkNavigator() {
    platformEl.textContent = navigator.platform || 'N/A';
    hardwareConcurrencyEl.textContent = navigator.hardwareConcurrency
        ? navigator.hardwareConcurrency.toString()
        : 'N/A';
    const nav = navigator;
    deviceMemoryEl.textContent = nav.deviceMemory
        ? `${nav.deviceMemory} GB`
        : 'N/A';
    userAgentEl.textContent = navigator.userAgent || 'N/A';
    screenSizeEl.textContent = `${screen.width} × ${screen.height}`;
    colorDepthEl.textContent = `${screen.colorDepth} bits`;
    devicePixelRatioEl.textContent = window.devicePixelRatio.toString();
}
// Event listeners
testGeolocationBtn.addEventListener('click', testGeolocation);
testWatchPositionBtn.addEventListener('click', testWatchPosition);
testWebRTCBtn.addEventListener('click', testWebRTC);
// Initialize
initialize();
