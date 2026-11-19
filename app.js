/**
 * MyGatherRound.app — 2027 SA Footy & Heritage Guide
 * Offline-first spectator & heritage companion for AFL Gather Round 2027 in South Australia.
 */

let allEvents = [];
let currentDayFilter = 'All';
let currentLumaFilter = 'All';
let currentClubFilter = 'All';
let currentSearchQuery = '';
let deferredPrompt = null;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const ADELAIDE_COORDS = { latitude: -34.9155, longitude: 138.5961 }; // Adelaide Oval
const WEATHER_CACHE_KEY = 'gatherWeatherSummaryV1';
const AUDIO_FEEDBACK_KEY = 'gatherAudioFeedback';
const PASSPORT_STORAGE_KEY = 'gatherPassportCheckinsV1';
const SAVED_EVENTS_KEY = 'gather_saved_events';
const SAVED_EVENTS_COMPAT_KEY = 'savedTDU';
let audioFeedbackContext = null;
const STANDALONE_LAUNCH_SESSION_KEY = 'gatherStandaloneLaunchTracked';
const WEATHER_PLACEHOLDER = 'Today in Adelaide: Checking weather…';
const WEATHER_UNAVAILABLE = 'Weather unavailable';

// Leaflet Map & Layer Groups
let scheduleMap = null;
let scheduleMarkersLayer = null;
let stadiumsLayer = null;
let sanflCurrentLayer = null;
let sanfl1990Layer = null;
let sanflGroundsLayer = null;
let defunctGroundsLayer = null;
let heritageLayer = null;
let toiletsLayer = null;
let waterLayer = null;
let isMobileScheduleMapActive = false;
let selectedMapEventId = null;

// Active Overlay Layers State (all layers default OFF on initial load)
let activeMapLayers = {
    stadiums: false,
    'sanfl-current': false,
    'sanfl-1990': false,
    'sanfl-grounds': false,
    defunct: false,
    heritage: false,
    toilets: false,
    water: false
};

// Data Caches
let cachedDefunctGrounds = null;
let cachedHeritageSites = null;
let cachedFacilities = null;
let cachedSanflCurrent = null;
let cachedSanfl1990 = null;

// Stadiums & Footy Express Hubs Dataset
const STADIUMS_AND_HUBS = [
    {
        name: "Adelaide Oval",
        type: "stadium",
        role: "Main Stadium (53,500 capacity)",
        coords: [-34.9155, 138.5961],
        address: "War Memorial Drive, North Adelaide SA",
        details: "Hosting 5 blockbuster matches. Free Footy Express bus, train, and tram travel included with AFL ticket.",
        icon: "fa-monument",
        color: "#C8102E"
    },
    {
        name: "Norwood Oval (Coopers Stadium)",
        type: "stadium",
        role: "Historic Suburban Match Venue (10,000 capacity)",
        coords: [-34.9213, 138.6347],
        address: "The Parade, Norwood SA",
        details: "Hosting 2 matches: Richmond v West Coast and Essendon v North Melbourne. Fan festival zones along The Parade.",
        icon: "fa-monument",
        color: "#C8102E"
    },
    {
        name: "Barossa Park, Lyndoch",
        type: "stadium",
        role: "Wine Country Match Venue",
        coords: [-34.6045, 138.8925],
        address: "Barossa Valley Way, Lyndoch SA",
        details: "Hosting 2 matches: Suns v Giants and Cats v Saints. Dedicated Barossa Express shuttles run from Adelaide CBD & Gawler.",
        icon: "fa-monument",
        color: "#C8102E"
    },
    {
        name: "Elder Park Footy Festival Hub",
        type: "hub",
        role: "Central Fan Festival Precinct",
        coords: [-34.9192, 138.5992],
        address: "King William Road, Adelaide Riverbank",
        details: "Open daily from 10am. Giant broadcast screens, all 18 club merchandise superstores, player signings, SA food trucks, and nightly fireworks.",
        icon: "fa-flag",
        color: "#FFB81C"
    },
    {
        name: "King William St & Currie St Footy Express Hub",
        type: "hub",
        role: "Primary City Bus Interchange",
        coords: [-34.9255, 138.5997],
        address: "Currie St & King William St, Adelaide CBD",
        details: "Free Footy Express matchday buses depart continuously for Adelaide Oval and Norwood Oval.",
        icon: "fa-bus",
        color: "#0A192F"
    },
    {
        name: "Adelaide Railway Station Footy Express Hub",
        type: "hub",
        role: "Train & Riverbank Footbridge Connection",
        coords: [-34.9216, 138.5950],
        address: "North Terrace, Adelaide CBD",
        details: "Free train travel with game ticket. Undercover walk across Riverbank Footbridge directly to Adelaide Oval South Gate.",
        icon: "fa-train",
        color: "#0A192F"
    },
    {
        name: "Gawler Central Station — Barossa Shuttle Link",
        type: "hub",
        role: "Gawler Train Line to Lyndoch Coach Hub",
        coords: [-34.5960, 138.7470],
        address: "Overway Bridge Road, Gawler SA",
        details: "Catch the Gawler train from Adelaide, then hop onto dedicated Barossa Park shuttle coaches into Lyndoch.",
        icon: "fa-bus",
        color: "#0A192F"
    },
    {
        name: "Tanunda Town Square & Shuttle Hub",
        type: "hub",
        role: "Barossa Food Village & Visitor Centre",
        coords: [-34.5240, 138.9600],
        address: "Murray Street, Tanunda SA",
        details: "Saturday post-match Food & Wine Village (4pm–10pm). Regional bus connections and local tasting pavilions.",
        icon: "fa-bus",
        color: "#0A192F"
    }
];

// Active SANFL Club Home Grounds (all 9 current SANFL venues)
const SANFL_GROUNDS = [
    {
        id: "sanfl-ground-glenelg",
        name: "Glenelg Oval",
        venue_alias: "Stratarama Stadium",
        club: "Glenelg Tigers",
        coords: [-34.9834, 138.5216],
        address: "Brighton Road & Williams Avenue, Glenelg East SA 5045",
        details: "Seaside fortress of the Glenelg Football Club since 1921, celebrated for its Brighton Road outer hill, heritage grandstands, and Tigers clubrooms.",
        color: "#FFB81C",
        textColor: "#0A192F",
        iconColor: "#0A192F"
    },
    {
        id: "sanfl-ground-norwood",
        name: "Norwood Oval",
        venue_alias: "Coopers Stadium",
        club: "Norwood Redlegs",
        coords: [-34.9198, 138.6305],
        address: "4 Woods Street (off The Parade), Norwood SA 5067",
        details: "Home of the 31-time SANFL premier Norwood Redlegs since 1901 and intimate AFL Gather Round suburban match venue in the heart of The Parade.",
        color: "#4A0E2E"
    },
    {
        id: "sanfl-ground-prospect",
        name: "Prospect Oval",
        venue_alias: "Prospect Oval",
        club: "North Adelaide Roosters",
        coords: [-34.8856, 138.6009],
        address: "Menzies Crescent, Prospect SA 5082",
        details: "Suburban home of the North Adelaide Roosters since 1922, where Barrie Robran starred and Ken Farmer kicked a record 1,417 SANFL career goals.",
        color: "#FF2A2A"
    },
    {
        id: "sanfl-ground-unley",
        name: "Unley Oval",
        venue_alias: "Thomas Farms Oval",
        club: "Sturt Double Blues",
        coords: [-34.9502, 138.6120],
        address: "Trimmer Terrace & Langham Terrace, Unley SA 5061",
        details: "Tree-lined spiritual home of the Sturt Double Blues since 1901, where coach Jack Oatey forged five consecutive SANFL premierships (1966–1970).",
        color: "#38BDF8",
        textColor: "#002B5C",
        iconColor: "#002B5C"
    },
    {
        id: "sanfl-ground-richmond",
        name: "Richmond Oval",
        venue_alias: "Hisense Stadium",
        club: "West Adelaide Bloods",
        coords: [-34.9377, 138.5683],
        address: "57 Milner Road, Richmond SA 5033",
        details: "Inner-west headquarters of the West Adelaide Bloods since 1958, renowned for its classic suburban terraces and Neil Kerley's premiership sides.",
        color: "#800000"
    },
    {
        id: "sanfl-ground-woodville",
        name: "Woodville Oval",
        venue_alias: "Maughan Thiem Kia Oval",
        club: "Woodville-West Torrens Eagles",
        coords: [-34.8881, 138.5383],
        address: "Oval Avenue, Woodville South SA 5011",
        details: "Primary home ground of the merged Woodville-West Torrens Eagles since 1991 (and home of the standalone Woodville Warriors from 1964 to 1990).",
        color: "#005A36"
    },
    {
        id: "sanfl-ground-alberton",
        name: "Alberton Oval",
        venue_alias: "Alberton Oval",
        club: "Port Adelaide Magpies",
        coords: [-34.8644, 138.5195],
        address: "Queen Street & Brougham Place, Alberton SA 5014",
        details: "Port Adelaide's spiritual home since 1880, featuring the Fos Williams bronze statue, historic Bob Quinn Grandstand, and club museum.",
        color: "#0A192F"
    },
    {
        id: "sanfl-ground-elizabeth",
        name: "Elizabeth Oval",
        venue_alias: "X Convenience Oval",
        club: "Central District Bulldogs",
        coords: [-34.7241, 138.6627],
        address: "10 Goodman Road, Elizabeth SA 5112",
        details: "Northern suburbs fortress of the Central District Bulldogs since 1964, powerhouse home to nine SANFL premierships between 2000 and 2010.",
        color: "#0047AB"
    },
    {
        id: "sanfl-ground-noarlunga",
        name: "Noarlunga Oval",
        venue_alias: "Magain Stadium (Flinders University Stadium)",
        club: "South Adelaide Panthers",
        coords: [-35.1454, 138.4929],
        address: "1 Lovelock Drive, Noarlunga Downs SA 5168",
        details: "Southern suburbs home ground of the foundation South Adelaide Panthers since 1995, overlooking the Onkaparinga hills and southern coast.",
        color: "#0B132B"
    }
];

const VIEW_ANALYTICS_CONFIG = {
    home: {
        page_title: 'MyGatherRound 2027 - Home',
        page_path: ''
    },
    schedule: {
        page_title: 'MyGatherRound 2027 - Fixture & Map',
        page_path: 'schedule'
    },
    saved: {
        page_title: 'MyGatherRound 2027 - My Weekend',
        page_path: 'my-weekend'
    }
};

const WEATHER_CODES = {
    0: 'Clear sky',
    1: 'Mostly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Foggy',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    80: 'Rain showers',
    81: 'Rain showers',
    82: 'Heavy showers',
    95: 'Thunderstorms'
};

const recommendationState = {
    isOpen: false,
    intent: '',
    option: ''
};

const activeViewEl = document.querySelector('.view.active');
let currentViewName = activeViewEl && activeViewEl.id ? activeViewEl.id.replace('view-', '') : 'home';
let hasTrackedInitialView = false;
let lastTrackedPageLocation = '';

const RECOMMENDATION_OPTIONS = {
    matches: [
        { id: 'adelaide-oval', label: 'Adelaide Oval Blockbusters' },
        { id: 'norwood', label: 'Norwood Oval Heritage' },
        { id: 'barossa', label: 'Barossa Park Wine Region' }
    ],
    pubs: [
        { id: 'cbd-pubs', label: 'Adelaide CBD Hotel Takeovers' },
        { id: 'norwood-pubs', label: 'The Parade Norwood Pubs' },
        { id: 'barossa-pubs', label: 'Barossa Country Pubs' }
    ],
    kids: [
        { id: 'clinics', label: 'Auskick & Junior Clinics' },
        { id: 'family-fest', label: 'Elder Park Kids Zone' }
    ],
    outer: [
        { id: 'speaker', label: 'Club Legend Speaker Nights' },
        { id: 'grassroots', label: 'Adelaide Footy League & SAAFL' },
        { id: 'podcast', label: 'Live Footy Podcasts' }
    ],
    parade: [
        { id: 'players-parade', label: 'Friday 18-Club Players Parade' },
        { id: 'elder-park', label: 'Elder Park Footy Festival' },
        { id: 'barossa-wine', label: 'Barossa Food & Wine Village' }
    ]
};

const INTENT_BUTTONS = [
    { id: 'matches', label: '🏟️ Watch a Match' },
    { id: 'pubs', label: '🍻 Supporter Pubs' },
    { id: 'kids', label: '👶 Kids & Clinics' },
    { id: 'outer', label: '📢 The Outer & Talks' },
    { id: 'parade', label: '🎉 Parade & Festival' }
];

const PASSPORT_BADGES = [
    {
        id: 'badge-opener',
        title: 'Opening Bounce',
        icon: '🏉',
        description: 'Check in to the opening blockbuster or any Gather Round match.',
        check: (checkins, events) => checkins.some((c) => {
            const ev = events.find((e) => String(e.id) === String(c.id));
            return ev && (ev.category === 'AFL Match' || ev.type === 'AFL Match');
        })
    },
    {
        id: 'badge-stadium-hopper',
        title: 'Stadium Hopper',
        icon: '🏟️',
        description: 'Check in at 2 or more different match venues (Adelaide Oval, Norwood Oval, or Barossa Park).',
        check: (checkins, events) => {
            const venues = new Set();
            checkins.forEach((c) => {
                const ev = events.find((e) => String(e.id) === String(c.id));
                if (ev && ev.venue) venues.add(ev.venue);
            });
            return venues.size >= 2;
        }
    },
    {
        id: 'badge-barossa',
        title: 'Barossa Bound',
        icon: '🍇',
        description: 'Check in to an event or match in the Barossa Valley (Lyndoch or Tanunda).',
        check: (checkins, events) => checkins.some((c) => {
            const ev = events.find((e) => String(e.id) === String(c.id));
            const text = `${ev ? ev.title : ''} ${ev ? ev.location : ''}`.toLowerCase();
            return text.includes('barossa') || text.includes('lyndoch') || text.includes('tanunda');
        })
    },
    {
        id: 'badge-the-outer',
        title: 'The Outer Legend',
        icon: '🍻',
        description: 'Check in to a supporter pub takeover or grassroots community event.',
        check: (checkins, events) => checkins.some((c) => {
            const ev = events.find((e) => String(e.id) === String(c.id));
            return ev && (ev.category === 'Supporter Pubs' || ev.category === 'The Outer');
        })
    },
    {
        id: 'badge-weekend-warrior',
        title: 'Gather Round Hero',
        icon: '⭐',
        description: 'Check in to 3 or more events across the weekend.',
        check: (checkins) => checkins.length >= 3
    }
];

function isStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).trim().split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
        }
    }
    return dateStr;
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes}${ampm}`;
}

function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function trackAnalyticsEvent(eventName, params = {}) {
    if (typeof window.gtag !== 'function') return;
    try {
        const sanitizedParams = {};
        Object.entries(params).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
                sanitizedParams[key] = val;
            }
        });
        window.gtag('event', eventName, sanitizedParams);
    } catch (e) {}
}

function trackVirtualPageView(viewName) {
    if (typeof window.gtag !== 'function') return;
    const config = VIEW_ANALYTICS_CONFIG[viewName] || {
        page_title: `MyGatherRound 2027 - ${viewName}`,
        page_path: viewName
    };
    try {
        window.gtag('event', 'page_view', {
            page_title: config.page_title,
            page_path: config.page_path
        });
    } catch (e) {}
}

function getSavedEvents() {
    try {
        const primary = JSON.parse(localStorage.getItem(SAVED_EVENTS_KEY) || 'null');
        if (Array.isArray(primary)) return primary.map(String);
        const compat = JSON.parse(localStorage.getItem(SAVED_EVENTS_COMPAT_KEY) || '[]');
        if (Array.isArray(compat)) return compat.map(String);
        return [];
    } catch (e) {
        return [];
    }
}

function saveSavedEvents(eventsArray) {
    try {
        const clean = Array.from(new Set(eventsArray.map(String)));
        localStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(clean));
        localStorage.setItem(SAVED_EVENTS_COMPAT_KEY, JSON.stringify(clean));
    } catch (e) {}
}

function isAudioFeedbackEnabled() {
    return localStorage.getItem(AUDIO_FEEDBACK_KEY) === 'true';
}

function setAudioFeedbackEnabled(enabled) {
    localStorage.setItem(AUDIO_FEEDBACK_KEY, enabled ? 'true' : 'false');
    updateSoundButtonUI(enabled);
}

function updateSoundButtonUI(enabled) {
    const btn = document.getElementById('sound-toggle-btn');
    if (!btn) return;
    btn.textContent = enabled ? 'On' : 'Off';
    btn.setAttribute('aria-checked', enabled ? 'true' : 'false');
}

function getAudioFeedbackContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioFeedbackContext || audioFeedbackContext.state === 'closed') {
        audioFeedbackContext = new AudioContextClass();
    }
    if (audioFeedbackContext.state === 'suspended') {
        audioFeedbackContext.resume().catch(() => {});
    }
    return audioFeedbackContext;
}

function playAudioCue(type) {
    if (!isAudioFeedbackEnabled()) return;
    const ctx = getAudioFeedbackContext();
    if (!ctx) return;

    try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'save') {
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.22);
        } else if (type === 'unsave') {
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.exponentialRampToValueAtTime(440.00, now + 0.12); // A4
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
            osc.start(now);
            osc.stop(now + 0.18);
        } else if (type === 'checkin') {
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'export') {
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554.37, now + 0.08);
            osc.frequency.setValueAtTime(659.25, now + 0.16);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        }
    } catch (e) {}
}

window.toggleAudioFeedback = function() {
    const nextState = !isAudioFeedbackEnabled();
    setAudioFeedbackEnabled(nextState);
    if (nextState) playAudioCue('save');
};

// Weather Widget
function renderWeatherWidget(message) {
    const widget = document.getElementById('weather-widget');
    if (!widget) return;
    const textEl = widget.querySelector('span');
    if (textEl) textEl.textContent = message;
}

async function updateWeatherWidget() {
    renderWeatherWidget(WEATHER_PLACEHOLDER);
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${ADELAIDE_COORDS.latitude}&longitude=${ADELAIDE_COORDS.longitude}&current_weather=true&timezone=Australia%2FAdelaide`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Weather fetch failed');
        const data = await res.json();
        const current = data.current_weather;
        if (current && typeof current.temperature === 'number') {
            const desc = WEATHER_CODES[current.weathercode] || 'Fair';
            const temp = Math.round(current.temperature);
            const wind = Math.round(current.windspeed);
            renderWeatherWidget(`Today in Adelaide: ${temp}°C, ${desc} • Wind ${wind} km/h`);
            return;
        }
        renderWeatherWidget(WEATHER_UNAVAILABLE);
    } catch (err) {
        renderWeatherWidget('Adelaide: Mild autumn footy weather expected');
    }
}

// Calendar Export (.ICS)
function formatICSDate(dateStr, timeStr) {
    const cleanDate = String(dateStr).replace(/-/g, '');
    const cleanTime = String(timeStr || '09:00').replace(':', '') + '00';
    return `${cleanDate}T${cleanTime}`;
}

function escapeICS(str) {
    return String(str || '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

async function exportEventsToCalendar(events, fileName = 'gather_round_2027_itinerary.ics') {
    const icsEvents = events.map((event) => {
        const date = event.date;
        const startTime = event.start_time || '12:00';
        const endTime = event.end_time || '15:00';
        const title = `${event.title || 'Gather Round Event'} (AFL Gather Round 2027)`;
        const description = `${event.description || ''}\nTime: ${event.time_display || startTime}\nTransit: ${event.transport_tips || 'Check Adelaide Metro'}`;
        const location = event.location || event.venue || 'Adelaide SA';
        const dtstart = formatICSDate(date, startTime);
        const dtend = formatICSDate(date, endTime);
        const uid = `${event.id || 'event'}-${date}@mygatherround.app`;

        return [
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${formatICSDate(new Date().toISOString().slice(0, 10), '00:00')}Z`,
            `DTSTART;TZID=Australia/Adelaide:${dtstart}`,
            `DTEND;TZID=Australia/Adelaide:${dtend}`,
            `SUMMARY:${escapeICS(title)}`,
            `DESCRIPTION:${escapeICS(description)}`,
            `LOCATION:${escapeICS(location)}`,
            'STATUS:CONFIRMED',
            'END:VEVENT'
        ].join('\r\n');
    });

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//MyGatherRound.app 2027//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Gather Round 2027 Itinerary',
        'X-WR-TIMEZONE:Australia/Adelaide',
        ...icsEvents,
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const file = new File([blob], fileName, { type: 'text/calendar;charset=utf-8' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'Gather Round 2027 Calendar Events',
                text: 'Add your selected AFL Gather Round matches and events to your calendar.'
            });
            playAudioCue('export');
            return true;
        } catch (error) {
            if (error.name === 'AbortError') return false;
        }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);

    playAudioCue('export');
    return true;
}

window.exportSavedEvents = async function() {
    const savedIds = getSavedEvents();
    if (savedIds.length === 0) {
        showToast('⭐ You have no events in your weekend itinerary to export.', { type: 'info' });
        return false;
    }
    const savedEventsList = allEvents.filter((event) => savedIds.includes(String(event.id)));
    const exported = await exportEventsToCalendar(savedEventsList, 'my_gather_round_2027_itinerary.ics');
    if (exported) {
        trackAnalyticsEvent('export_itinerary_calendar', { event_count: savedEventsList.length });
    }
    return exported;
};

window.exportStageToCalendar = async function(eventId) {
    const event = allEvents.find((e) => String(e.id) === String(eventId));
    if (!event) return;
    await exportEventsToCalendar([event], `gather_round_${event.id}.ics`);
};

window.shareItinerary = async function() {
    const savedIds = getSavedEvents();
    if (savedIds.length === 0) {
        showToast('⭐ Save some events to your weekend itinerary before sharing!', { type: 'info', duration: 3500 });
        return;
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?plan=${savedIds.join(',')}`;
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'My AFL Gather Round 2027 Itinerary',
                text: `Check out my offline Gather Round footy schedule (${savedIds.length} events planned)!`,
                url: shareUrl
            });
            return;
        } catch (e) {
            if (e.name === 'AbortError') return;
        }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('🔗 Itinerary deep link copied to clipboard!');
    }
};

// Toast notification helper
function showToast(message, options = {}) {
    const existing = document.getElementById('app-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'app-toast';
    toast.innerHTML = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('visible'), 10);
    const duration = options.duration || 3000;
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Passport Check-ins
function getCheckins() {
    try {
        const stored = JSON.parse(localStorage.getItem(PASSPORT_STORAGE_KEY) || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch (e) {
        return [];
    }
}

function isEventCheckedIn(eventId) {
    const checkins = getCheckins();
    return checkins.some((c) => String(c.id) === String(eventId));
}

window.handleEventCheckIn = function(eventId, btnEl) {
    const strId = String(eventId);
    const checkins = getCheckins();
    const existingIdx = checkins.findIndex((c) => String(c.id) === strId);

    if (existingIdx !== -1) {
        checkins.splice(existingIdx, 1);
        localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(checkins));
        if (btnEl) {
            btnEl.classList.remove('checked-in');
            btnEl.innerHTML = '<i class="fas fa-map-pin" aria-hidden="true"></i> Check In';
        }
        playAudioCue('unsave');
        renderRiderPassportWidget();
        return;
    }

    checkins.push({ id: strId, timestamp: new Date().toISOString() });
    localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(checkins));
    if (btnEl) {
        btnEl.classList.add('checked-in');
        btnEl.innerHTML = '<i class="fas fa-check-circle" aria-hidden="true"></i> Checked In';
    }
    playAudioCue('checkin');
    showToast('📍 <strong>Checked in!</strong> Added to your Fan Passport.');
    renderRiderPassportWidget();
};

function renderRiderPassportWidget() {
    const container = document.getElementById('saved-events-container');
    const existingPassport = document.getElementById('fan-passport-widget');
    if (existingPassport) existingPassport.remove();

    const checkins = getCheckins();
    const unlockedBadges = PASSPORT_BADGES.filter((b) => b.check(checkins, allEvents));
    const completionPct = Math.round((unlockedBadges.length / PASSPORT_BADGES.length) * 100);

    const passportHTML = `
        <div class="guide-panel" id="fan-passport-widget" style="margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0; font-size:1.05rem; color:var(--primary);"><i class="fas fa-award" style="color:var(--gold);"></i> Footy Fan Passport</h3>
                <span style="font-size:0.8rem; font-weight:700; color:var(--crimson);">${unlockedBadges.length} of ${PASSPORT_BADGES.length} Badges (${completionPct}%)</span>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px;">
                ${PASSPORT_BADGES.map((badge) => {
                    const isUnlocked = unlockedBadges.some((b) => b.id === badge.id);
                    return `
                        <div style="padding:10px; border-radius:8px; border:1px solid ${isUnlocked ? 'var(--gold)' : '#E2E8F0'}; background:${isUnlocked ? '#FFFDF5' : '#F8FAFC'}; opacity:${isUnlocked ? '1' : '0.6'}; text-align:center;">
                            <div style="font-size:1.5rem; margin-bottom:4px;">${badge.icon}</div>
                            <strong style="font-size:0.8rem; display:block; color:var(--navy);">${escapeHTML(badge.title)}</strong>
                            <span style="font-size:0.7rem; color:var(--text-light); line-height:1.2; display:block; margin-top:2px;">${escapeHTML(badge.description)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    if (container) {
        container.insertAdjacentHTML('afterbegin', passportHTML);
    }
}

// Recommendation Flow Helper Functions
function getRecommendationResult(intent, option) {
    let matches = [];
    let summary = '';

    if (intent === 'matches') {
        if (option === 'adelaide-oval') {
            matches = allEvents.filter((e) => (e.category === 'AFL Match' || e.type === 'AFL Match') && (e.location || '').includes('Adelaide Oval'));
            summary = 'Adelaide Oval Blockbusters under lights & weekend afternoons:';
        } else if (option === 'norwood') {
            matches = allEvents.filter((e) => (e.category === 'AFL Match' || e.type === 'AFL Match') && (e.location || '').includes('Norwood'));
            summary = 'Suburban traditional footy on The Parade at Norwood Oval:';
        } else if (option === 'barossa') {
            matches = allEvents.filter((e) => (e.category === 'AFL Match' || e.type === 'AFL Match') && (e.location || '').includes('Barossa'));
            summary = 'Gather Round in the vineyards at Barossa Park Lyndoch:';
        }
    } else if (intent === 'pubs') {
        matches = allEvents.filter((e) => e.category === 'Supporter Pubs');
        if (option === 'cbd-pubs') {
            matches = matches.filter((e) => (e.location || '').includes('CBD') || (e.location || '').includes('North Adelaide'));
            summary = 'Interstate fan supporter hotel takeovers in Adelaide CBD:';
        } else if (option === 'norwood-pubs') {
            matches = matches.filter((e) => (e.location || '').includes('Norwood'));
            summary = 'Matchday supporter venues along The Parade in Norwood:';
        } else if (option === 'barossa-pubs') {
            matches = matches.filter((e) => (e.location || '').includes('Lyndoch') || (e.location || '').includes('Tanunda'));
            summary = 'Historic country footy pubs in the Barossa:';
        }
    } else if (intent === 'kids') {
        matches = allEvents.filter((e) => e.category === 'Kids & Clinics');
        summary = 'AFL club junior clinics and Auskick masterclasses at SANFL ovals:';
    } else if (intent === 'outer') {
        matches = allEvents.filter((e) => e.category === 'The Outer');
        summary = 'Grassroots footy matches, live podcasts, and club legend speaker nights:';
    } else if (intent === 'parade') {
        matches = allEvents.filter((e) => e.category === 'Parade & Festival');
        summary = 'City players parade and Elder Park festival precincts:';
    }

    return {
        matches: matches.map((e) => ({ event: e, reason: e.round_info || e.category })),
        summary: summary || 'Recommended Gather Round events for you:',
        emptyMessage: 'No events found for this selection.'
    };
}

function intentHasEvents(intentId) {
    if (intentId === 'matches') return allEvents.some((e) => e.category === 'AFL Match' || e.type === 'AFL Match');
    if (intentId === 'pubs') return allEvents.some((e) => e.category === 'Supporter Pubs');
    if (intentId === 'kids') return allEvents.some((e) => e.category === 'Kids & Clinics');
    if (intentId === 'outer') return allEvents.some((e) => e.category === 'The Outer');
    if (intentId === 'parade') return allEvents.some((e) => e.category === 'Parade & Festival');
    return true;
}

function renderRecommendationFlow() {
    const flow = document.getElementById('recommendation-flow');
    const launchBtn = document.getElementById('recommendation-launch-btn');
    const intentButtons = document.getElementById('recommendation-intent-buttons');
    const stepTwo = document.getElementById('recommendation-step-two');
    const optionButtons = document.getElementById('recommendation-option-buttons');
    const backBtn = document.getElementById('recommendation-back-btn');
    const results = document.getElementById('recommendation-results');
    if (!flow || !launchBtn || !intentButtons) return;

    launchBtn.setAttribute('aria-expanded', recommendationState.isOpen ? 'true' : 'false');
    flow.hidden = !recommendationState.isOpen;

    intentButtons.innerHTML = INTENT_BUTTONS.map((btn) => {
        const available = intentHasEvents(btn.id);
        if (!available) {
            return `
                <button type="button" class="choice-btn btn-disabled" disabled aria-disabled="true" title="Coming Soon">
                    ${btn.label} <span style="font-size:0.72rem; font-weight:600; opacity:0.8;">(Coming Soon)</span>
                </button>
            `;
        }
        return `
            <button type="button" class="choice-btn ${recommendationState.intent === btn.id ? 'active' : ''}" onclick="selectRecommendationIntent('${btn.id}')">
                ${btn.label}
            </button>
        `;
    }).join('');

    const options = RECOMMENDATION_OPTIONS[recommendationState.intent] || [];
    stepTwo.hidden = !recommendationState.intent;
    optionButtons.innerHTML = options.map((opt) => `
        <button type="button" class="choice-btn ${recommendationState.option === opt.id ? 'active' : ''}" onclick="selectRecommendationOption('${opt.id}')">
            ${opt.label}
        </button>
    `).join('');

    backBtn.hidden = !recommendationState.intent;

    if (!recommendationState.isOpen) {
        results.innerHTML = '';
        return;
    }
    if (!recommendationState.intent) {
        results.innerHTML = "<p class='helper-copy'>Pick what you're in the mood for above.</p>";
        return;
    }
    if (!recommendationState.option) {
        results.innerHTML = "<p class='helper-copy'>Choose a category above to view top recommendations.</p>";
        return;
    }

    const result = getRecommendationResult(recommendationState.intent, recommendationState.option);
    if (!result.matches.length) {
        results.innerHTML = `<div class="placeholder-card">${escapeHTML(result.emptyMessage)}</div>`;
        return;
    }

    results.innerHTML = `
        <div class="helper-copy">${escapeHTML(result.summary)}</div>
        <div class="recommendation-list">
            ${result.matches.slice(0, 3).map(({ event, reason }) => `
                <div class="recommendation-item">
                    <div class="recommendation-title"><strong>${escapeHTML(event.title)}</strong></div>
                    <div class="recommendation-meta">${event.time_display ? escapeHTML(event.time_display) : formatDate(event.date)} • ${escapeHTML(event.location || '')}</div>
                    <button type="button" class="btn btn-sm btn-primary" style="margin-top:8px;" onclick="panMapToEvent('${escapeHTML(event.id)}')">Show on Map →</button>
                </div>
            `).join('')}
        </div>
    `;
}

window.openRecommendationFlow = function() {
    recommendationState.isOpen = true;
    renderRecommendationFlow();
    trackAnalyticsEvent('open_recommendation_flow');
};

window.selectRecommendationIntent = function(intent) {
    recommendationState.isOpen = true;
    recommendationState.intent = intent;
    recommendationState.option = '';
    renderRecommendationFlow();
};

window.selectRecommendationOption = function(optionId) {
    recommendationState.option = optionId;
    renderRecommendationFlow();
};

window.goBackRecommendation = function() {
    recommendationState.option = '';
    recommendationState.intent = '';
    renderRecommendationFlow();
};

window.resetRecommendationFlow = function() {
    recommendationState.isOpen = false;
    recommendationState.intent = '';
    recommendationState.option = '';
    renderRecommendationFlow();
};

// Data Fetching & Remote KV Sponsor Integration
async function fetchRemoteSponsors() {
    try {
        const res = await fetch('https://tdu-push-backend.callas1894.workers.dev/gather-sponsors');
        if (res.ok) {
            const data = await res.json();
            if (data && data.headline) {
                localStorage.setItem('GATHER_SPONSORS', JSON.stringify(data));
                renderSchedule();
            }
        }
    } catch (e) {
        // Offline: uses cached GATHER_SPONSORS or fallback card
    }
}

function getSponsorCardHTML() {
    let customSponsor = null;
    try {
        const stored = localStorage.getItem('GATHER_SPONSORS');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.headline && parsed.active !== false) {
                customSponsor = parsed;
            }
        }
    } catch (e) {}

    if (customSponsor) {
        const badge = customSponsor.badge || 'PARTNER SPOTLIGHT';
        const venue = customSponsor.venue ? `${escapeHTML(customSponsor.venue)} — ` : '';
        const headline = `${venue}${escapeHTML(customSponsor.headline)}`;
        const desc = escapeHTML(customSponsor.description || '');
        const link = escapeHTML(customSponsor.link || 'mailto:callas1894@gmail.com?subject=MyGatherRound%20Partner%20Inquiry');
        const btnText = escapeHTML(customSponsor.buttonText || 'View Match-Day Specials');
        return `
            <div class="card event-card sponsor-showcase-card">
                <div class="event-badges">
                    <span class="tag sponsor-tag"><i class="fas fa-bullhorn"></i> ${escapeHTML(badge)}</span>
                </div>
                <h3 class="event-title">${headline}</h3>
                <p class="event-desc">${desc}</p>
                <div class="card-actions">
                    <a href="${link}" target="_blank" rel="noopener" class="btn btn-outline-primary">
                        <i class="far fa-compass"></i> ${btnText}
                    </a>
                </div>
            </div>
        `;
    }

    return `
        <div class="card event-card sponsor-showcase-card">
            <div class="event-badges">
                <span class="tag sponsor-tag"><i class="fas fa-bullhorn"></i> PARTNER SPOTLIGHT</span>
            </div>
            <h3 class="event-title">Spotlight Your Venue or Brand</h3>
            <p class="event-desc">Put your hotel, brewery, or matchday event in front of 200,000+ Gather Round footy fans across South Australia.</p>
            <div class="card-actions">
                <a href="mailto:callas1894@gmail.com?subject=MyGatherRound%20Partner%20Inquiry" class="btn btn-outline-primary">
                    <i class="far fa-envelope"></i> Inquire for Placements
                </a>
            </div>
        </div>
    `;
}

// Coordinate parsing helper
function parseCoordinates(coordsStr) {
    if (!coordsStr || typeof coordsStr !== 'string') return null;
    const parts = coordsStr.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
        return { lat: parts[0], lng: parts[1] };
    }
    return null;
}

// Category and Search Filtering
function matchesSearchQuery(event, query) {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    if (!q) return true;

    const title = String(event.title || '').toLowerCase();
    const desc = String(event.description || '').toLowerCase();
    const loc = String(event.location || '').toLowerCase();
    const venue = String(event.venue || '').toLowerCase();
    const cat = String(event.category || '').toLowerCase();
    const type = String(event.type || '').toLowerCase();
    const clubs = Array.isArray(event.clubs) ? event.clubs.map((c) => String(c).toLowerCase()).join(' ') : '';
    const tags = Array.isArray(event.tags) ? event.tags.map((t) => String(t).toLowerCase()).join(' ') : '';

    return title.includes(q)
        || desc.includes(q)
        || loc.includes(q)
        || venue.includes(q)
        || cat.includes(q)
        || type.includes(q)
        || clubs.includes(q)
        || tags.includes(q);
}

function matchesCategoryFilter(event, filter) {
    if (!filter || filter === 'All' || filter === '🏉 All') return true;
    const cat = String(event.category || '').toLowerCase();
    const type = String(event.type || '').toLowerCase();
    const f = filter.toLowerCase();

    if (f.includes('match')) {
        return cat.includes('match') || type.includes('match');
    }
    if (f.includes('kids') || f.includes('clinic')) {
        return cat.includes('kids') || cat.includes('clinic') || type.includes('clinic');
    }
    if (f.includes('pub') || f.includes('supporter')) {
        return cat.includes('pub') || type.includes('pub') || cat.includes('supporter');
    }
    if (f.includes('outer')) {
        return cat.includes('outer') || type.includes('outer') || type.includes('community') || type.includes('speaker') || type.includes('podcast');
    }
    if (f.includes('parade') || f.includes('fest')) {
        return cat.includes('parade') || cat.includes('fest') || type.includes('parade') || type.includes('festival');
    }
    return cat.includes(f) || type.includes(f);
}

function getFilteredScheduleEvents() {
    let displayEvents = allEvents.slice();

    if (currentSearchQuery) {
        displayEvents = displayEvents.filter((event) => matchesSearchQuery(event, currentSearchQuery));
    }

    if (currentDayFilter !== 'All') {
        displayEvents = displayEvents.filter((event) => event.date === currentDayFilter);
    }

    if (currentLumaFilter === 'My Weekend') {
        const saved = getSavedEvents();
        displayEvents = displayEvents.filter((event) => saved.includes(String(event.id)));
    } else if (currentLumaFilter !== 'All') {
        displayEvents = displayEvents.filter((event) => matchesCategoryFilter(event, currentLumaFilter));
    }

    if (currentClubFilter !== 'All') {
        const cLower = currentClubFilter.toLowerCase();
        displayEvents = displayEvents.filter((event) => {
            if (Array.isArray(event.clubs)) {
                return event.clubs.some((cl) => {
                    const clLower = String(cl).toLowerCase();
                    return clLower === cLower || clLower.includes(cLower) || cLower.includes(clLower);
                });
            }
            const text = `${event.title || ''} ${event.description || ''} ${(event.tags || []).join(' ')}`.toLowerCase();
            return text.includes(cLower);
        });
    }

    return displayEvents;
}

function createEventCardHTML(event, eventId, isSaved) {
    const title = event.title || 'Untitled Event';
    const category = event.category || '';
    const dateDisplay = formatDate(event.date);
    const timeDisplay = event.time_display || (event.start_time ? `${formatTime(event.start_time)} ACST` : '');
    const location = event.location || event.venue || 'Adelaide SA';
    const description = event.description || '';
    const isCheckedIn = isEventCheckedIn(eventId);
    const coords = parseCoordinates(event.coords);
    const navLink = coords
        ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
        : `https://maps.google.com/?q=${encodeURIComponent(location)}`;

    return `
        <div class="card event-card" id="event-${eventId}">
            <div class="event-badges">
                <span class="tag">${escapeHTML(category)}</span>
                ${event.round_info ? `<span class="tag secondary-tag">${escapeHTML(event.round_info)}</span>` : ''}
                <button type="button" class="fav-btn star-toggle-btn ${isSaved ? 'saved' : ''}" onclick="toggleSave('${escapeHTML(eventId)}', this)" aria-label="Toggle My Weekend" aria-pressed="${isSaved ? 'true' : 'false'}" title="${isSaved ? 'In My Weekend Itinerary' : 'Add to My Weekend'}">
                    <i class="${isSaved ? 'fas' : 'far'} fa-star" aria-hidden="true"></i>
                    <span class="star-label">${isSaved ? '⭐ In Weekend' : '☆ Add'}</span>
                </button>
            </div>

            <h3 class="event-title">${escapeHTML(title)}</h3>

            <div class="event-meta">
                ${dateDisplay || timeDisplay ? `<span><i class="far fa-calendar" aria-hidden="true"></i> ${dateDisplay}${timeDisplay ? ` • <strong>${escapeHTML(timeDisplay)}</strong>` : ''}</span>` : ''}
                <span><i class="fas fa-location-dot" aria-hidden="true"></i> ${escapeHTML(location)}</span>
            </div>

            ${description ? `<div class="event-desc">${escapeHTML(description)}</div>` : ''}

            ${event.transport_tips ? `<div class="event-desc" style="background:#F1F5F9; padding:8px 12px; border-radius:8px; font-size:0.8rem; margin-top:8px; border-left:3px solid var(--navy);"><i class="fas fa-bus" style="color:var(--crimson);"></i> <strong>Transit:</strong> ${escapeHTML(event.transport_tips)}</div>` : ''}

            <div class="card-primary-actions">
                <button type="button" class="btn btn-checkin ${isCheckedIn ? 'checked-in' : ''}" onclick="handleEventCheckIn('${escapeHTML(eventId)}', this)">
                    <i class="${isCheckedIn ? 'fas fa-check-circle' : 'fas fa-map-pin'}" aria-hidden="true"></i>
                    ${isCheckedIn ? 'Checked In' : 'Check In'}
                </button>
                <button type="button" class="btn btn-map-pin" onclick="panMapToEvent('${escapeHTML(eventId)}')">
                    <i class="fas fa-map-location-dot" aria-hidden="true"></i> Show on Map
                </button>
            </div>

            <details class="card-details-toggle">
                <summary class="details-summary-btn">
                    <span><i class="fas fa-compass" aria-hidden="true"></i> Directions &amp; Actions</span>
                    <i class="fas fa-chevron-down summary-arrow" aria-hidden="true"></i>
                </summary>
                <div class="secondary-actions-grid">
                    <a href="${navLink}" target="_blank" rel="noopener" class="btn btn-secondary-action">
                        <i class="fas fa-location-arrow" aria-hidden="true"></i> 1-Tap Directions
                    </a>
                    <button type="button" class="btn btn-secondary-action" onclick="exportStageToCalendar('${escapeHTML(eventId)}')">
                        <i class="far fa-calendar-plus" aria-hidden="true"></i> Add to Calendar
                    </button>
                </div>
            </details>
        </div>
    `;
}

function renderSchedule() {
    const container = document.getElementById('events-container');
    if (!container) return;
    container.innerHTML = '';

    const displayEvents = getFilteredScheduleEvents();

    if (displayEvents.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding:30px; color:#666;'>No Gather Round events found for this filter selection.</p>";
        return;
    }

    const savedEvents = getSavedEvents();
    let matchCount = 0;
    let sponsorInjected = false;

    displayEvents.forEach((event, index) => {
        const eventId = String(event.id || index + 1);
        const isSaved = savedEvents.includes(eventId);
        container.innerHTML += createEventCardHTML(event, eventId, isSaved);

        if (event.category === 'AFL Match' || event.type === 'AFL Match') {
            matchCount++;
            if (!sponsorInjected && matchCount === 2) {
                container.innerHTML += getSponsorCardHTML();
                sponsorInjected = true;
            }
        }
    });

    if (!sponsorInjected && displayEvents.length > 0) {
        container.innerHTML += getSponsorCardHTML();
    }
}

function renderSaved() {
    const container = document.getElementById('saved-events-container');
    if (!container) return;
    container.innerHTML = '';

    const savedIds = getSavedEvents();
    const savedEventsList = allEvents.filter((event) => savedIds.includes(String(event.id)));

    renderRiderPassportWidget();

    if (savedEventsList.length === 0) {
        container.innerHTML += `
            <div class="placeholder-card" style="text-align:center; padding:40px 20px;">
                <i class="far fa-star fa-3x" style="color:var(--gold); margin-bottom:14px;"></i>
                <h3 style="margin:0 0 8px 0; color:var(--navy);">Your Weekend Itinerary is Empty</h3>
                <p style="color:var(--text-light); max-width:420px; margin:0 auto 18px auto; font-size:0.9rem;">
                    Browse the 2027 AFL Gather Round fixture and tap the <strong>⭐ Add</strong> button on any match, Auskick clinic, or supporter pub takeover to build your offline itinerary!
                </p>
                <button type="button" class="btn btn-primary" onclick="showView('schedule')">
                    Explore Gather Round Fixture →
                </button>
            </div>
        `;
        return;
    }

    savedEventsList.forEach((event) => {
        const eventId = String(event.id);
        container.innerHTML += createEventCardHTML(event, eventId, true);
    });
}

function updateSavedBadge() {
    const savedEvents = getSavedEvents();
    const badge = document.getElementById('nav-badge');
    const homeCount = document.getElementById('home-saved-count');

    if (savedEvents.length > 0) {
        if (badge) {
            badge.innerText = savedEvents.length;
            badge.style.display = 'block';
        }
        if (homeCount) homeCount.innerText = `${savedEvents.length} event${savedEvents.length > 1 ? 's' : ''} saved offline`;
    } else {
        if (badge) badge.style.display = 'none';
        if (homeCount) homeCount.innerText = '0 events saved offline';
    }
}

window.toggleSave = function(id, btnElement) {
    let savedEvents = getSavedEvents();
    const strId = String(id);

    if (savedEvents.includes(strId)) {
        savedEvents = savedEvents.filter((eventId) => eventId !== strId);
        if (btnElement) {
            btnElement.classList.remove('saved');
            btnElement.innerHTML = '<i class="far fa-star" aria-hidden="true"></i> <span class="star-label">☆ Add</span>';
        }
        playAudioCue('unsave');
        trackAnalyticsEvent('remove_saved_event', { event_id: strId });
    } else {
        savedEvents.push(strId);
        if (btnElement) {
            btnElement.classList.add('saved');
            btnElement.innerHTML = '<i class="fas fa-star" aria-hidden="true"></i> <span class="star-label">⭐ In Weekend</span>';
        }
        playAudioCue('save');
        trackAnalyticsEvent('save_event', { event_id: strId });
    }

    if (btnElement) btnElement.setAttribute('aria-pressed', savedEvents.includes(strId) ? 'true' : 'false');
    saveSavedEvents(savedEvents);
    updateSavedBadge();

    const activeView = document.querySelector('.view.active');
    if (activeView && activeView.id === 'view-saved') {
        renderSaved();
    }
};

// Filter controllers
function syncCategoryFilterPills() {
    const pills = document.querySelectorAll('#luma-category-filters .luma-pill');
    pills.forEach((pill) => {
        const category = pill.getAttribute('data-category');
        if (!category || category === 'All' || category === 'My Weekend') {
            pill.hidden = false;
            pill.style.display = '';
            return;
        }
        const hasEvents = allEvents.some((event) => matchesCategoryFilter(event, category));
        pill.hidden = !hasEvents;
        pill.style.display = hasEvents ? '' : 'none';
        if (!hasEvents && currentLumaFilter === category) {
            currentLumaFilter = 'All';
            pills.forEach((b) => b.classList.remove('active'));
            const allPill = document.querySelector('#luma-category-filters .luma-pill[data-category="All"]');
            if (allPill) allPill.classList.add('active');
        }
    });
}

window.applyClubFilter = function(club, btn) {
    if (btn && club !== currentClubFilter && window.TDUHaptics) window.TDUHaptics.navigation();
    currentClubFilter = club;
    selectedMapEventId = null;
    document.querySelectorAll('#club-filters .club-pill').forEach((b) => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderSchedule();
    updateScheduleMapMarkers();
    trackAnalyticsEvent('filter_club', { club });
};

window.applyLumaCategory = function(category, btn) {
    if (btn && category !== currentLumaFilter && window.TDUHaptics) window.TDUHaptics.navigation();
    currentLumaFilter = category;
    selectedMapEventId = null;
    document.querySelectorAll('#luma-category-filters .luma-pill').forEach((b) => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderSchedule();
    updateScheduleMapMarkers();
    trackAnalyticsEvent('filter_category_pill', { category });
};

window.applyDayFilter = function(day, btn) {
    if (btn && day !== currentDayFilter && window.TDUHaptics) window.TDUHaptics.navigation();
    currentDayFilter = day;
    selectedMapEventId = null;
    document.querySelectorAll('#day-filters .filter-btn').forEach((b) => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderSchedule();
    updateScheduleMapMarkers();
    trackAnalyticsEvent('filter_day', { day });
};

window.handleScheduleSearch = function(query) {
    currentSearchQuery = query || '';
    const clearBtn = document.getElementById('schedule-search-clear');
    if (clearBtn) clearBtn.style.display = currentSearchQuery ? 'block' : 'none';
    renderSchedule();
    updateScheduleMapMarkers();
};

window.clearScheduleSearch = function() {
    currentSearchQuery = '';
    selectedMapEventId = null;
    const input = document.getElementById('schedule-search-input');
    if (input) input.value = '';
    const clearBtn = document.getElementById('schedule-search-clear');
    if (clearBtn) clearBtn.style.display = 'none';
    renderSchedule();
    updateScheduleMapMarkers();
};

function renderFeaturedEvents() {
    const container = document.getElementById('featured-events');
    if (!container) return;
    const featured = allEvents.filter((e) => e.category === 'AFL Match').slice(0, 3);
    container.innerHTML = featured.map((ev) => `
        <div class="card event-card">
            <span class="tag" style="background:var(--crimson); color:white;">AFL MATCH</span>
            <h4 class="event-title" style="margin:6px 0 4px 0;">${escapeHTML(ev.title)}</h4>
            <div class="event-meta">
                <span><i class="far fa-calendar"></i> ${formatDate(ev.date)} • ${escapeHTML(ev.time_display || '')}</span>
                <span><i class="fas fa-location-dot"></i> ${escapeHTML(ev.location || '')}</span>
            </div>
            <button type="button" class="btn btn-sm btn-primary" style="margin-top:10px;" onclick="panMapToEvent('${escapeHTML(ev.id)}')">
                <i class="fas fa-map-location-dot"></i> View on Map
            </button>
        </div>
    `).join('');
}

// ==========================================================================
// Interactive Leaflet Map & SA Footy Heritage Layers
// ==========================================================================

function getEventCategoryColor(event) {
    const cat = `${event.category || ''} ${event.type || ''}`.toLowerCase();
    if (cat.includes('match')) return { bg: '#C8102E', icon: 'fa-football', label: 'AFL Match' };
    if (cat.includes('parade') || cat.includes('festival')) return { bg: '#FFB81C', icon: 'fa-flag', label: 'Festival / Parade' };
    if (cat.includes('kids') || cat.includes('clinic')) return { bg: '#0D9488', icon: 'fa-child', label: 'Kids & Clinics' };
    if (cat.includes('pub') || cat.includes('supporter')) return { bg: '#D97706', icon: 'fa-beer-mug-empty', label: 'Supporter Pub' };
    if (cat.includes('outer')) return { bg: '#1E3A8A', icon: 'fa-bullhorn', label: 'The Outer' };
    return { bg: '#0A192F', icon: 'fa-location-dot', label: 'Event' };
}

function buildSchedulePopup(event, meta, eventId) {
    const timeDisplay = event.time_display || formatTime(event.start_time);
    const loc = event.location || event.venue || 'Adelaide SA';
    return `
        <div class="map-popup-card">
            <div class="popup-tag" style="background:${meta.bg}; color:#fff;">${escapeHTML(meta.label)}</div>
            <h4 class="popup-title">${escapeHTML(event.title || 'Event')}</h4>
            <div class="popup-meta">
                ${event.date ? `<span><i class="far fa-calendar"></i> ${formatDate(event.date)}</span>` : ''}
                ${timeDisplay ? `<span><i class="far fa-clock"></i> ${escapeHTML(timeDisplay)}</span>` : ''}
                <span><i class="fas fa-location-dot"></i> ${escapeHTML(loc)}</span>
            </div>
            <button type="button" class="btn btn-primary popup-action-btn" onclick="focusEventFromMap('${escapeHTML(eventId)}')">
                <i class="fas fa-arrow-down"></i> View in List
            </button>
        </div>
    `;
}

async function initScheduleMap() {
    const container = document.getElementById('schedule-interactive-map');
    const statusEl = document.getElementById('schedule-map-status');
    if (!container) return;

    if (scheduleMap) {
        scheduleMap.invalidateSize();
        updateScheduleMapMarkers();
        return;
    }

    let L;
    try {
        if (statusEl) statusEl.textContent = 'Loading map…';
        L = await window.TDUCdn.load('leaflet');
    } catch (err) {
        if (statusEl) statusEl.textContent = 'Map unavailable offline.';
        return;
    }

    if (scheduleMap) return;

    scheduleMap = L.map(container, {
        center: [-34.9285, 138.6007],
        zoom: 11,
        scrollWheelZoom: false
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(scheduleMap);

    scheduleMarkersLayer = L.layerGroup().addTo(scheduleMap);

    if (statusEl) statusEl.textContent = '';
    scheduleMap.invalidateSize();

    await applyMapOverlayLayers();
    updateScheduleMapMarkers();
}

function hasActiveEventMapFilter() {
    return currentClubFilter !== 'All' || currentDayFilter !== 'All';
}

function updateScheduleMapMarkers() {
    if (!scheduleMap || !scheduleMarkersLayer || !window.L) return;
    scheduleMarkersLayer.clearLayers();

    const filterActive = hasActiveEventMapFilter();
    if (!filterActive && !selectedMapEventId) {
        return;
    }

    let events = [];
    if (filterActive) {
        events = getFilteredScheduleEvents();
        if (selectedMapEventId && !events.some((ev) => String(ev.id) === selectedMapEventId)) {
            const selectedEv = allEvents.find((ev) => String(ev.id) === selectedMapEventId);
            if (selectedEv) events = events.concat(selectedEv);
        }
    } else if (selectedMapEventId) {
        const selectedEv = allEvents.find((ev) => String(ev.id) === selectedMapEventId);
        if (selectedEv) events = [selectedEv];
    }

    const bounds = [];

    events.forEach((event, idx) => {
        const eventId = String(event.id || idx + 1);
        const coords = parseCoordinates(event.coords);
        const meta = getEventCategoryColor(event);

        if (coords) {
            const point = [coords.lat, coords.lng];
            bounds.push(point);
            const customIcon = window.L.divIcon({
                className: 'custom-map-marker',
                html: `<div class="marker-pin" style="background-color: ${meta.bg};" data-event-id="${escapeHTML(eventId)}">
                          <i class="fas ${meta.icon}"></i>
                       </div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -30]
            });
            const marker = window.L.marker(point, { icon: customIcon });
            marker.eventId = eventId;
            marker.bindPopup(buildSchedulePopup(event, meta, eventId));
            marker.on('click', () => highlightEventCard(eventId));
            scheduleMarkersLayer.addLayer(marker);
        }
    });

    if (bounds.length > 0 && filterActive && !selectedMapEventId) {
        scheduleMap.fitBounds(window.L.latLngBounds(bounds), { padding: [35, 35], maxZoom: 13 });
    }
}

// Map Overlay Layers (Stadiums, SANFL Zones, Defunct Grounds, Heritage, Facilities)
window.toggleMapLayer = async function(layerKey) {
    if (!activeMapLayers.hasOwnProperty(layerKey)) return;

    // Mutually exclusive SANFL zone layer logic
    if (layerKey === 'sanfl-current' && !activeMapLayers['sanfl-current']) {
        if (activeMapLayers['sanfl-1990']) {
            activeMapLayers['sanfl-1990'] = false;
            updateLayerButtonUI('sanfl-1990', false);
            if (sanfl1990Layer && scheduleMap && scheduleMap.hasLayer(sanfl1990Layer)) {
                scheduleMap.removeLayer(sanfl1990Layer);
            }
        }
    } else if (layerKey === 'sanfl-1990' && !activeMapLayers['sanfl-1990']) {
        if (activeMapLayers['sanfl-current']) {
            activeMapLayers['sanfl-current'] = false;
            updateLayerButtonUI('sanfl-current', false);
            if (sanflCurrentLayer && scheduleMap && scheduleMap.hasLayer(sanflCurrentLayer)) {
                scheduleMap.removeLayer(sanflCurrentLayer);
            }
        }
    }

    activeMapLayers[layerKey] = !activeMapLayers[layerKey];
    updateLayerButtonUI(layerKey, activeMapLayers[layerKey]);

    if (!scheduleMap) {
        await initScheduleMap();
    } else {
        await applyMapOverlayLayers();
    }
};

function updateLayerButtonUI(layerKey, isActive) {
    const btn = document.getElementById('layer-toggle-' + layerKey);
    if (btn) btn.classList.toggle('active', Boolean(isActive));
}

async function applyMapOverlayLayers() {
    if (!scheduleMap || !window.L) return;

    // 1. Stadiums & Footy Express Hubs (Default OFF)
    if (activeMapLayers.stadiums) {
        if (!stadiumsLayer) {
            stadiumsLayer = window.L.layerGroup();
            STADIUMS_AND_HUBS.forEach((hub) => {
                const iconHtml = `<div class="marker-pin" style="background-color: ${hub.color};"><i class="fas ${hub.icon}"></i></div>`;
                const customIcon = window.L.divIcon({
                    className: 'custom-map-marker',
                    html: iconHtml,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -30]
                });
                const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${hub.coords[0]},${hub.coords[1]}`;
                const popup = `
                    <div class="map-popup-card">
                        <div class="popup-tag" style="background:${hub.color}; color:#fff;">${hub.type === 'stadium' ? 'MATCH STADIUM' : 'TRANSIT HUB'}</div>
                        <h4 class="popup-title">${escapeHTML(hub.name)}</h4>
                        <div class="popup-meta">
                            <span><strong>${escapeHTML(hub.role)}</strong></span>
                            <span><i class="fas fa-location-dot"></i> ${escapeHTML(hub.address)}</span>
                        </div>
                        <p style="font-size:0.78rem; line-height:1.4; color:#334155; margin:6px 0;">${escapeHTML(hub.details)}</p>
                        <a href="${dirUrl}" target="_blank" rel="noopener" class="popup-btn popup-btn-nav" style="display:inline-flex; margin-top:6px;">
                            <i class="fas fa-location-arrow"></i> 1-Tap Directions
                        </a>
                    </div>
                `;
                const marker = window.L.marker(hub.coords, { icon: customIcon }).bindPopup(popup);
                stadiumsLayer.addLayer(marker);
            });
        }
        if (!scheduleMap.hasLayer(stadiumsLayer)) stadiumsLayer.addTo(scheduleMap);
    } else if (stadiumsLayer && scheduleMap.hasLayer(stadiumsLayer)) {
        scheduleMap.removeLayer(stadiumsLayer);
    }

    // 2. SANFL Recruiting Zones (Current)
    if (activeMapLayers['sanfl-current']) {
        if (!sanflCurrentLayer) {
            try {
                if (!cachedSanflCurrent) {
                    const res = await fetch('data/sanfl-zones-current.geojson');
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    cachedSanflCurrent = await res.json();
                }
                sanflCurrentLayer = window.L.geoJSON(cachedSanflCurrent, {
                    style: (feature) => ({
                        fillColor: feature.properties.fillColor,
                        color: feature.properties.strokeColor,
                        weight: 2.5,
                        opacity: 1,
                        fillOpacity: 0.45
                    }),
                    onEachFeature: (feature, layer) => {
                        const p = feature.properties;
                        const popupContent = `
                            <div class="map-popup-card sanfl-popup-card">
                                <div class="popup-tag" style="background:${p.fillColor}; color:#fff;">${escapeHTML(p.era)}</div>
                                <h4 class="popup-title">${escapeHTML(p.name)} (${escapeHTML(p.nickname)})</h4>
                                <div class="popup-meta">
                                    <span><i class="fas fa-landmark"></i> Home: <strong>${escapeHTML(p.home_oval)}</strong></span>
                                    <span><i class="fas fa-map-location-dot"></i> Footprint: ${escapeHTML(p.description)}</span>
                                    ${p.famous_players ? `<span><i class="fas fa-star" style="color:var(--gold);"></i> Legends: ${escapeHTML(p.famous_players)}</span>` : ''}
                                </div>
                                <p style="font-size:0.78rem; line-height:1.4; color:#334155; margin:6px 0;">${escapeHTML(p.trivia)}</p>
                            </div>
                        `;
                        layer.bindPopup(popupContent);
                        layer.on('mouseover', () => {
                            if (typeof layer.bringToFront === 'function') layer.bringToFront();
                        });
                    }
                });
            } catch (err) {
                console.warn('Failed to load current SANFL zones', err);
                showToast('⚠️ Unable to load Current SANFL Recruiting Zones.', { type: 'error' });
            }
        }
        if (sanflCurrentLayer && !scheduleMap.hasLayer(sanflCurrentLayer)) {
            sanflCurrentLayer.addTo(scheduleMap);
            if (typeof sanflCurrentLayer.bringToFront === 'function') {
                sanflCurrentLayer.bringToFront();
            }
        }
    } else if (sanflCurrentLayer && scheduleMap.hasLayer(sanflCurrentLayer)) {
        scheduleMap.removeLayer(sanflCurrentLayer);
    }

    // 3. SANFL Recruiting Zones (1990 Pre-Crows Era)
    if (activeMapLayers['sanfl-1990']) {
        if (!sanfl1990Layer) {
            try {
                if (!cachedSanfl1990) {
                    const res = await fetch('data/sanfl-zones-1990.geojson');
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    cachedSanfl1990 = await res.json();
                }
                sanfl1990Layer = window.L.geoJSON(cachedSanfl1990, {
                    style: (feature) => ({
                        fillColor: feature.properties.fillColor,
                        color: feature.properties.strokeColor,
                        weight: 2.5,
                        opacity: 1,
                        fillOpacity: 0.45
                    }),
                    onEachFeature: (feature, layer) => {
                        const p = feature.properties;
                        const popupContent = `
                            <div class="map-popup-card sanfl-popup-card">
                                <div class="popup-tag" style="background:${p.fillColor}; color:#fff;">${escapeHTML(p.era)}</div>
                                <h4 class="popup-title">${escapeHTML(p.name)} (${escapeHTML(p.nickname)})</h4>
                                <div class="popup-meta">
                                    <span><i class="fas fa-landmark"></i> Home: <strong>${escapeHTML(p.home_oval)}</strong></span>
                                    <span><i class="fas fa-map-location-dot"></i> 1990 Territory: ${escapeHTML(p.description)}</span>
                                    ${p.famous_players ? `<span><i class="fas fa-star" style="color:var(--gold);"></i> 1990 Stars: ${escapeHTML(p.famous_players)}</span>` : ''}
                                </div>
                                <p style="font-size:0.78rem; line-height:1.4; color:#334155; margin:6px 0;">${escapeHTML(p.trivia)}</p>
                            </div>
                        `;
                        layer.bindPopup(popupContent);
                        layer.on('mouseover', () => {
                            if (typeof layer.bringToFront === 'function') layer.bringToFront();
                        });
                    }
                });
            } catch (err) {
                console.warn('Failed to load 1990 SANFL zones', err);
                showToast('⚠️ Unable to load 1990 SANFL Recruiting Zones.', { type: 'error' });
            }
        }
        if (sanfl1990Layer && !scheduleMap.hasLayer(sanfl1990Layer)) {
            sanfl1990Layer.addTo(scheduleMap);
            if (typeof sanfl1990Layer.bringToFront === 'function') {
                sanfl1990Layer.bringToFront();
            }
        }
    } else if (sanfl1990Layer && scheduleMap.hasLayer(sanfl1990Layer)) {
        scheduleMap.removeLayer(sanfl1990Layer);
    }

    // 4. Defunct Grounds Layer
    if (activeMapLayers.defunct) {
        if (!defunctGroundsLayer) {
            try {
                if (!cachedDefunctGrounds) {
                    const res = await fetch('defunct-grounds.json');
                    cachedDefunctGrounds = await res.json();
                }
                defunctGroundsLayer = window.L.layerGroup();
                cachedDefunctGrounds.forEach((ground) => {
                    const coords = parseCoordinates(ground.coords);
                    if (!coords) return;
                    const customIcon = window.L.divIcon({
                        className: 'custom-map-marker',
                        html: `<div class="marker-pin" style="background-color: #475569;"><i class="fas fa-landmark"></i></div>`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 30],
                        popupAnchor: [0, -28]
                    });
                    const popup = `
                        <div class="map-popup-card defunct-popup-card">
                            <div class="popup-tag" style="background:#475569; color:#fff;">DEFUNCT GROUND</div>
                            <h4 class="popup-title">${escapeHTML(ground.name)}</h4>
                            <div class="popup-meta">
                                <span><i class="far fa-clock"></i> Years Active: <strong>${escapeHTML(ground.years_active)}</strong></span>
                                <span><i class="fas fa-users"></i> Tenants: ${escapeHTML((ground.tenants || []).join(', '))}</span>
                                <span><i class="fas fa-location-dot"></i> ${escapeHTML(ground.address)}</span>
                            </div>
                            <p style="font-size:0.78rem; margin:6px 0; color:#334155;"><strong>History:</strong> ${escapeHTML(ground.historical_significance)}</p>
                            <p style="font-size:0.78rem; margin:6px 0; color:#059669;"><strong>What's there now:</strong> ${escapeHTML(ground.what_is_there_now)}</p>
                            <a href="${ground.directions_url}" target="_blank" rel="noopener" class="popup-btn popup-btn-nav" style="display:inline-flex; margin-top:6px;">
                                <i class="fas fa-location-arrow"></i> 1-Tap Directions
                            </a>
                        </div>
                    `;
                    const marker = window.L.marker([coords.lat, coords.lng], { icon: customIcon }).bindPopup(popup);
                    defunctGroundsLayer.addLayer(marker);
                });
            } catch (err) {
                console.warn('Failed to load defunct grounds', err);
            }
        }
        if (defunctGroundsLayer && !scheduleMap.hasLayer(defunctGroundsLayer)) {
            defunctGroundsLayer.addTo(scheduleMap);
        }
    } else if (defunctGroundsLayer && scheduleMap.hasLayer(defunctGroundsLayer)) {
        scheduleMap.removeLayer(defunctGroundsLayer);
    }

    // 4b. Active SANFL Grounds Layer (Default OFF)
    if (activeMapLayers['sanfl-grounds']) {
        if (!sanflGroundsLayer) {
            sanflGroundsLayer = window.L.layerGroup();
            SANFL_GROUNDS.forEach((ground) => {
                const iconColorStyle = ground.iconColor ? `color: ${ground.iconColor};` : '';
                const isPortAdelaide = ground.id === 'sanfl-ground-alberton' || ground.club === 'Port Adelaide Magpies';
                const isSturt = ground.id === 'sanfl-ground-unley' || ground.club === 'Sturt Double Blues';
                const isNorwood = ground.id === 'sanfl-ground-norwood' || ground.club === 'Norwood Redlegs';
                const isCentralDistrict = ground.id === 'sanfl-ground-elizabeth' || ground.club === 'Central District Bulldogs';
                const isNorthAdelaide = ground.id === 'sanfl-ground-prospect' || ground.club === 'North Adelaide Roosters';
                const isWestAdelaide = ground.id === 'sanfl-ground-richmond' || ground.club === 'West Adelaide Bloods';
                const innerHtml = isPortAdelaide
                    ? `<img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR110NNUAGbDufewTJHMdkyzYBLfDn3o0Mo7x2dl3JhBQ&s=10" style="transform: rotate(45deg); width: 0.82rem; height: 0.82rem; object-fit: contain;" alt="Port Adelaide" />`
                    : isSturt
                    ? `<img src="icons/grounds/sturt.png" style="transform: rotate(45deg); width: 0.82rem; height: 0.82rem; object-fit: contain;" alt="Sturt" />`
                    : isNorwood
                    ? `<img src="icons/grounds/norwood.png" style="transform: rotate(45deg); width: 0.82rem; height: 0.82rem; object-fit: contain;" alt="Norwood" />`
                    : isCentralDistrict
                    ? `<img src="icons/grounds/central-district.jpg" style="transform: rotate(45deg); width: 0.82rem; height: 0.82rem; object-fit: contain;" alt="Central District" />`
                    : isNorthAdelaide
                    ? `<img src="icons/grounds/north-adelaide.png" style="transform: rotate(45deg); width: 0.82rem; height: 0.82rem; object-fit: contain;" alt="North Adelaide" />`
                    : isWestAdelaide
                    ? `<img src="icons/grounds/west-adelaide.png" style="transform: rotate(45deg); width: 0.82rem; height: 0.82rem; object-fit: contain;" alt="West Adelaide" />`
                    : `<i class="fas fa-football" style="${iconColorStyle}"></i>`;
                const customIcon = window.L.divIcon({
                    className: 'custom-map-marker',
                    html: `<div class="marker-pin" style="background-color: ${ground.color};">${innerHtml}</div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 30],
                    popupAnchor: [0, -28]
                });
                const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${ground.coords[0]},${ground.coords[1]}`;
                const popup = `
                    <div class="map-popup-card sanfl-ground-popup-card">
                        <div class="popup-tag" style="background:${ground.color}; color:${ground.textColor || '#fff'};">SANFL HOME GROUND</div>
                        <h4 class="popup-title">${escapeHTML(ground.name)}</h4>
                        <div class="popup-meta">
                            <span><i class="fas fa-shield-halved"></i> Club: <strong>${escapeHTML(ground.club)}</strong></span>
                            ${ground.venue_alias && ground.venue_alias !== ground.name ? `<span><i class="fas fa-landmark"></i> Also known as: ${escapeHTML(ground.venue_alias)}</span>` : ''}
                            <span><i class="fas fa-location-dot"></i> ${escapeHTML(ground.address)}</span>
                        </div>
                        <p style="font-size:0.78rem; line-height:1.4; color:#334155; margin:6px 0;">${escapeHTML(ground.details)}</p>
                        <a href="${dirUrl}" target="_blank" rel="noopener" class="popup-btn popup-btn-nav" style="display:inline-flex; margin-top:6px;">
                            <i class="fas fa-location-arrow"></i> 1-Tap Directions
                        </a>
                    </div>
                `;
                const marker = window.L.marker(ground.coords, { icon: customIcon }).bindPopup(popup);
                sanflGroundsLayer.addLayer(marker);
            });
        }
        if (!scheduleMap.hasLayer(sanflGroundsLayer)) {
            sanflGroundsLayer.addTo(scheduleMap);
        }
    } else if (sanflGroundsLayer && scheduleMap.hasLayer(sanflGroundsLayer)) {
        scheduleMap.removeLayer(sanflGroundsLayer);
    }

    // 5. Footy Heritage & Roots Layer
    if (activeMapLayers.heritage) {
        if (!heritageLayer) {
            try {
                if (!cachedHeritageSites) {
                    const res = await fetch('heritage.json');
                    cachedHeritageSites = await res.json();
                }
                heritageLayer = window.L.layerGroup();
                cachedHeritageSites.forEach((site) => {
                    const coords = parseCoordinates(site.coords);
                    if (!coords) return;
                    const customIcon = window.L.divIcon({
                        className: 'custom-map-marker',
                        html: `<div class="marker-pin" style="background-color: var(--crimson);"><i class="fas fa-trophy"></i></div>`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 30],
                        popupAnchor: [0, -28]
                    });
                    const popup = `
                        <div class="map-popup-card heritage-popup-card">
                            <div class="popup-tag" style="background:var(--crimson); color:#fff;">${escapeHTML(site.category)}</div>
                            <h4 class="popup-title">${escapeHTML(site.title)}</h4>
                            <div class="popup-meta">
                                <span><i class="fas fa-landmark"></i> Venue: <strong>${escapeHTML(site.name)}</strong></span>
                                <span><i class="fas fa-location-dot"></i> ${escapeHTML(site.address)}</span>
                            </div>
                            <p style="font-size:0.78rem; margin:6px 0; color:#334155;">${escapeHTML(site.description)}</p>
                            <div class="popup-actions-row">
                                ${site.source_url ? `
                                    <a href="${escapeHTML(site.source_url)}" target="_blank" rel="noopener" class="popup-btn popup-btn-copy">
                                        <i class="fas fa-arrow-up-right-from-square"></i> Source
                                    </a>
                                ` : ''}
                                <a href="${site.directions_url}" target="_blank" rel="noopener" class="popup-btn popup-btn-nav">
                                    <i class="fas fa-location-arrow"></i> 1-Tap Directions
                                </a>
                            </div>
                        </div>
                    `;
                    const marker = window.L.marker([coords.lat, coords.lng], { icon: customIcon }).bindPopup(popup);
                    heritageLayer.addLayer(marker);
                });
            } catch (err) {
                console.warn('Failed to load heritage sites', err);
            }
        }
        if (heritageLayer && !scheduleMap.hasLayer(heritageLayer)) {
            heritageLayer.addTo(scheduleMap);
        }
    } else if (heritageLayer && scheduleMap.hasLayer(heritageLayer)) {
        scheduleMap.removeLayer(heritageLayer);
    }

    // 6. Toilets & Water Refills
    if (activeMapLayers.toilets || activeMapLayers.water) {
        if (!cachedFacilities) {
            try {
                const res = await fetch('facilities.json');
                cachedFacilities = await res.json();
            } catch (err) {
                console.warn('Failed to load facilities', err);
            }
        }

        if (activeMapLayers.toilets) {
            if (!toiletsLayer && cachedFacilities) {
                toiletsLayer = window.L.layerGroup();
                cachedFacilities.filter((f) => f.type === 'toilet').forEach((f) => {
                    const coords = parseCoordinates(f.coords);
                    if (!coords) return;
                    const customIcon = window.L.divIcon({
                        className: 'custom-map-marker',
                        html: `<div class="marker-pin" style="background-color: #0284C7;"><i class="fas fa-restroom"></i></div>`,
                        iconSize: [26, 26],
                        iconAnchor: [13, 26],
                        popupAnchor: [0, -24]
                    });
                    const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
                    const popup = `
                        <div class="map-popup-card">
                            <div class="popup-tag" style="background:#0284C7; color:#fff;">🚻 PUBLIC RESTROOM</div>
                            <h4 class="popup-title">${escapeHTML(f.name)}</h4>
                            <div class="popup-meta">
                                <span><i class="fas fa-map-pin"></i> Precinct: <strong>${escapeHTML(f.precinct)}</strong></span>
                                <span>${escapeHTML(f.details)}</span>
                            </div>
                            <a href="${dirUrl}" target="_blank" rel="noopener" class="popup-btn popup-btn-nav" style="display:inline-flex; margin-top:6px;">
                                <i class="fas fa-location-arrow"></i> 1-Tap Directions
                            </a>
                        </div>
                    `;
                    toiletsLayer.addLayer(window.L.marker([coords.lat, coords.lng], { icon: customIcon }).bindPopup(popup));
                });
            }
            if (toiletsLayer && !scheduleMap.hasLayer(toiletsLayer)) toiletsLayer.addTo(scheduleMap);
        } else if (toiletsLayer && scheduleMap.hasLayer(toiletsLayer)) {
            scheduleMap.removeLayer(toiletsLayer);
        }

        if (activeMapLayers.water) {
            if (!waterLayer && cachedFacilities) {
                waterLayer = window.L.layerGroup();
                cachedFacilities.filter((f) => f.type === 'water').forEach((f) => {
                    const coords = parseCoordinates(f.coords);
                    if (!coords) return;
                    const customIcon = window.L.divIcon({
                        className: 'custom-map-marker',
                        html: `<div class="marker-pin" style="background-color: #059669;"><i class="fas fa-droplet"></i></div>`,
                        iconSize: [26, 26],
                        iconAnchor: [13, 26],
                        popupAnchor: [0, -24]
                    });
                    const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
                    const popup = `
                        <div class="map-popup-card">
                            <div class="popup-tag" style="background:#059669; color:#fff;">💧 WATER REFILL</div>
                            <h4 class="popup-title">${escapeHTML(f.name)}</h4>
                            <div class="popup-meta">
                                <span><i class="fas fa-map-pin"></i> Precinct: <strong>${escapeHTML(f.precinct)}</strong></span>
                                <span>${escapeHTML(f.details)}</span>
                            </div>
                            <a href="${dirUrl}" target="_blank" rel="noopener" class="popup-btn popup-btn-nav" style="display:inline-flex; margin-top:6px;">
                                <i class="fas fa-location-arrow"></i> 1-Tap Directions
                            </a>
                        </div>
                    `;
                    waterLayer.addLayer(window.L.marker([coords.lat, coords.lng], { icon: customIcon }).bindPopup(popup));
                });
            }
            if (waterLayer && !scheduleMap.hasLayer(waterLayer)) waterLayer.addTo(scheduleMap);
        } else if (waterLayer && scheduleMap.hasLayer(waterLayer)) {
            scheduleMap.removeLayer(waterLayer);
        }
    } else {
        if (toiletsLayer && scheduleMap.hasLayer(toiletsLayer)) scheduleMap.removeLayer(toiletsLayer);
        if (waterLayer && scheduleMap.hasLayer(waterLayer)) scheduleMap.removeLayer(waterLayer);
    }
}

function highlightEventCard(eventId) {
    const card = document.getElementById(`event-${eventId}`);
    if (!card) return;
    document.querySelectorAll('.event-card.highlighted').forEach((c) => c.classList.remove('highlighted'));
    card.classList.add('highlighted');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => card.classList.remove('highlighted'), 2500);
}

window.focusEventFromMap = function(eventId) {
    if (isMobileScheduleMapActive) {
        toggleMobileScheduleView();
    }
    highlightEventCard(eventId);
};

window.panMapToEvent = async function(eventId) {
    const event = allEvents.find((e) => String(e.id) === String(eventId));
    if (!event) return;

    const coords = parseCoordinates(event.coords);
    if (!coords) {
        if (event.location) {
            window.open(`https://maps.google.com/?q=${encodeURIComponent(event.location)}`, '_blank', 'noopener');
        }
        return;
    }

    selectedMapEventId = String(event.id);

    if (currentViewName !== 'schedule') showView('schedule');
    if (window.innerWidth < 900 && !isMobileScheduleMapActive) {
        toggleMobileScheduleView();
    }

    await initScheduleMap();
    await new Promise((resolve) => setTimeout(resolve, 250));

    if (scheduleMap) {
        scheduleMap.invalidateSize();
        updateScheduleMapMarkers();
        scheduleMap.flyTo([coords.lat, coords.lng], 14, { duration: 0.8 });
        if (scheduleMarkersLayer) {
            scheduleMarkersLayer.eachLayer((layer) => {
                if (layer.eventId === String(eventId)) {
                    layer.openPopup();
                }
            });
        }
    }
};

window.toggleMobileScheduleView = function() {
    const scheduleView = document.getElementById('view-schedule');
    const toggleLabel = document.getElementById('mobile-toggle-label');
    const toggleIcon = document.getElementById('mobile-toggle-icon');
    if (!scheduleView) return;

    isMobileScheduleMapActive = !isMobileScheduleMapActive;
    scheduleView.classList.toggle('mobile-map-active', isMobileScheduleMapActive);

    if (toggleLabel) toggleLabel.textContent = isMobileScheduleMapActive ? 'List View' : 'Map View';
    if (toggleIcon) toggleIcon.className = isMobileScheduleMapActive ? 'fas fa-list' : 'fas fa-map';

    if (isMobileScheduleMapActive) {
        setTimeout(() => {
            if (scheduleMap) {
                scheduleMap.invalidateSize();
                updateScheduleMapMarkers();
            }
        }, 200);
    }

    if (window.TDUHaptics) window.TDUHaptics.navigation();
};

// View Navigation
window.showView = function(viewName) {
    const viewEl = document.getElementById('view-' + viewName);
    const navEl = document.getElementById('nav-' + viewName);
    if (!viewEl || (!navEl && viewName !== 'settings' && viewName !== 'vault')) return;

    const isSameView = currentViewName === viewName && viewEl.classList.contains('active');
    if (!isSameView) {
        if (window.TDUHaptics) window.TDUHaptics.navigation();
        document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
        viewEl.classList.add('active');
        if (navEl) navEl.classList.add('active');
        currentViewName = viewName;
    }

    const settingsBtn = document.getElementById('header-settings-btn');
    if (settingsBtn) settingsBtn.classList.toggle('active', viewName === 'settings');

    if (viewName === 'schedule') {
        renderSchedule();
        initScheduleMap();
        setTimeout(() => {
            if (scheduleMap) {
                scheduleMap.invalidateSize();
                updateScheduleMapMarkers();
            }
        }, 220);
    } else if (viewName === 'saved') {
        renderSaved();
    } else if (viewName === 'vault') {
        initFootyVault();
    }

    trackVirtualPageView(viewName);
};

// Modals
window.openSupportModal = function() {
    const modal = document.getElementById('support-modal');
    if (modal) modal.classList.add('active');
};

window.closeSupportModal = function(e) {
    if (e && e.target !== e.currentTarget && !e.target.classList.contains('close-btn')) return;
    const modal = document.getElementById('support-modal');
    if (modal) modal.classList.remove('active');
};

window.openFeedbackModal = function() {
    const modal = document.getElementById('feedback-modal');
    if (modal) modal.classList.add('active');
};

window.closeFeedbackModal = function(e) {
    if (e && e.target !== e.currentTarget && !e.target.classList.contains('close-btn')) return;
    const modal = document.getElementById('feedback-modal');
    if (modal) modal.classList.remove('active');
};

window.openFeedbackForm = function() {
    window.open('https://forms.gle/2UWyokw2GM65tKsW9', '_blank', 'noopener');
};

window.openInstallModal = function() {
    const modal = document.getElementById('install-modal');
    if (modal) modal.classList.add('active');
};

window.closeInstallModal = function(e) {
    if (e && e.target !== e.currentTarget && !e.target.classList.contains('close-btn')) return;
    const modal = document.getElementById('install-modal');
    if (modal) modal.classList.remove('active');
};

// Stage Map Modal (for single venue view)
window.openStageMap = function(eventId) {
    panMapToEvent(eventId);
};

window.closeStageMap = function() {
    const modal = document.getElementById('stage-map-modal');
    if (modal) modal.classList.remove('active');
};

// Push alert in-app toast receiver
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PUSH_RECEIVED') {
            const payload = event.data.payload || {};
            showToast(`📣 <strong>${escapeHTML(payload.title || 'Gather Round Alert')}</strong><br>${escapeHTML(payload.body || '')}`, { duration: 6000 });
            playAudioCue('checkin');
        }
    });
}

// App Initialization
async function initApp() {
    try {
        const res = await fetch('events.json');
        allEvents = await res.json();
    } catch (err) {
        console.error('Failed to load events.json', err);
    }

    syncCategoryFilterPills();
    Object.keys(activeMapLayers).forEach((key) => {
        updateLayerButtonUI(key, activeMapLayers[key]);
    });
    renderSchedule();
    renderFeaturedEvents();
    updateSavedBadge();
    updateWeatherWidget();
    fetchRemoteSponsors();

    // Check URL parameters (e.g. ?plan=..., ?event=...)
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get('plan');
    if (planParam) {
        const ids = planParam.split(',').map((s) => s.trim()).filter(Boolean);
        if (ids.length) {
            saveSavedEvents(ids);
            updateSavedBadge();
            showView('saved');
            showToast(`⭐ Loaded ${ids.length} events into your weekend itinerary!`);
        }
    }

    const eventParam = params.get('event');
    if (eventParam) {
        setTimeout(() => panMapToEvent(eventParam), 300);
    }

    const viewParam = params.get('view');
    if (viewParam && ['home', 'schedule', 'saved', 'settings', 'vault'].includes(viewParam)) {
        showView(viewParam);
    }
}

// ======================================================================
// FOOTY VAULT — Shake-to-Reveal Classic SA Player Bios
// ======================================================================
let vaultPlayers = [];
let vaultInitialized = false;
let devicemotionActive = false;
let lastMotionX = null;
let lastMotionY = null;
let lastMotionZ = null;
let lastShakeTimestamp = 0;
const SHAKE_DELTA_THRESHOLD = 14;
const SHAKE_COOLDOWN_MS = 900;

async function loadVaultData() {
    if (vaultPlayers.length > 0) return;
    try {
        const res = await fetch('data/footy-vault.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        vaultPlayers = await res.json();
    } catch (err) {
        console.warn('Failed to load footy-vault.json', err);
        showToast('⚠️ Could not load Footy Vault bios.', { type: 'error' });
        vaultPlayers = [];
    }
}

function handleDeviceMotion(event) {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;

    const x = acc.x;
    const y = acc.y;
    const z = acc.z;

    if (x === null || y === null || z === null) return;

    const now = Date.now();

    if (lastMotionX !== null && lastMotionY !== null && lastMotionZ !== null) {
        const deltaX = Math.abs(x - lastMotionX);
        const deltaY = Math.abs(y - lastMotionY);
        const deltaZ = Math.abs(z - lastMotionZ);

        const isSignificantMotion = (deltaX > SHAKE_DELTA_THRESHOLD && deltaY > SHAKE_DELTA_THRESHOLD) ||
                                    (deltaX > SHAKE_DELTA_THRESHOLD && deltaZ > SHAKE_DELTA_THRESHOLD) ||
                                    (deltaY > SHAKE_DELTA_THRESHOLD && deltaZ > SHAKE_DELTA_THRESHOLD) ||
                                    (deltaX + deltaY + deltaZ > SHAKE_DELTA_THRESHOLD * 2);

        if (isSignificantMotion && (now - lastShakeTimestamp > SHAKE_COOLDOWN_MS)) {
            lastShakeTimestamp = now;
            if (navigator.vibrate) {
                try { navigator.vibrate(40); } catch (_) {}
            }
            if (window.TDUHaptics) window.TDUHaptics.success();
            revealRandomPlayer();
        }
    }

    lastMotionX = x;
    lastMotionY = y;
    lastMotionZ = z;
}

function startNativeShakeSensor() {
    if (devicemotionActive) return;
    window.addEventListener('devicemotion', handleDeviceMotion, false);
    devicemotionActive = true;

    const statusBadge = document.getElementById('vault-sensor-status');
    if (statusBadge) {
        statusBadge.textContent = '🟢 Shake Sensor Active — Flick phone to draw!';
        statusBadge.classList.add('sensor-active');
    }

    const unlockBtn = document.getElementById('vault-unlock-btn');
    if (unlockBtn) {
        unlockBtn.style.display = 'none';
    }
}

function initFootyVault() {
    if (!vaultInitialized) {
        vaultInitialized = true;
        loadVaultData();
    }

    const unlockBtn = document.getElementById('vault-unlock-btn');
    const statusBadge = document.getElementById('vault-sensor-status');

    // iOS 13+ requires explicit user gesture permission via DeviceMotionEvent.requestPermission
    const isIOSPermissionRequired = typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function';

    if (isIOSPermissionRequired) {
        if (!devicemotionActive) {
            if (unlockBtn) unlockBtn.style.display = 'inline-flex';
            if (statusBadge) {
                statusBadge.textContent = '⚪ Tap below to unlock motion sensor';
                statusBadge.classList.remove('sensor-active');
            }
        } else {
            if (unlockBtn) unlockBtn.style.display = 'none';
            if (statusBadge) {
                statusBadge.textContent = '🟢 Shake Sensor Active — Flick phone to draw!';
                statusBadge.classList.add('sensor-active');
            }
        }
    } else if (typeof window.DeviceMotionEvent !== 'undefined') {
        // Android / modern devices supporting devicemotion without explicit permission gate
        startNativeShakeSensor();
    } else {
        if (unlockBtn) unlockBtn.style.display = 'none';
        if (statusBadge) {
            statusBadge.textContent = '⚪ Tap below to draw!';
            statusBadge.classList.remove('sensor-active');
        }
    }
}

window.unlockVault = function() {
    // Synchronous execution path required inside click handler for iOS Safari permission grant
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(function(state) {
                if (state === 'granted') {
                    startNativeShakeSensor();
                } else {
                    const statusBadge = document.getElementById('vault-sensor-status');
                    if (statusBadge) {
                        statusBadge.textContent = '⚪ Permission denied — Tap button below!';
                        statusBadge.classList.remove('sensor-active');
                    }
                }
            })
            .catch(function(err) {
                console.warn('DeviceMotionEvent permission error:', err);
                const statusBadge = document.getElementById('vault-sensor-status');
                if (statusBadge) {
                    statusBadge.textContent = '⚪ Sensor unavailable — Tap button below!';
                    statusBadge.classList.remove('sensor-active');
                }
            });
    } else {
        startNativeShakeSensor();
    }
};

window.triggerVaultShake = function() {
    if (navigator.vibrate) {
        try { navigator.vibrate(40); } catch (_) {}
    }
    if (window.TDUHaptics) window.TDUHaptics.success();
    revealRandomPlayer();
};

async function revealRandomPlayer() {
    await loadVaultData();
    if (vaultPlayers.length === 0) return;

    const player = vaultPlayers[Math.floor(Math.random() * vaultPlayers.length)];
    const container = document.getElementById('vault-card-container');
    if (!container) return;

    container.innerHTML = `
        <div class="vault-player-card" style="background-color: ${escapeHTML(player.bg_color || '#ADD8E6')};">
            <div class="vault-card-number">${escapeHTML(player.card_number || '')}</div>
            <div class="vault-card-initials">${getInitials(player.name)}</div>
            <h3 class="vault-card-name">${escapeHTML(player.name)}</h3>
            <div class="vault-card-nickname">"${escapeHTML(player.nickname)}"</div>
            <div class="vault-card-position">${escapeHTML(player.position)} · ${escapeHTML(player.era)}</div>
            <div class="vault-card-stats-grid">
                <div class="vault-stat-block">
                    <div class="vault-stat-label">SANFL Club</div>
                    <div class="vault-stat-value">${escapeHTML(player.sanfl_club)}</div>
                </div>
                <div class="vault-stat-block">
                    <div class="vault-stat-label">SANFL Record</div>
                    <div class="vault-stat-value">${escapeHTML(player.sanfl_stats)}</div>
                </div>
                <div class="vault-stat-block">
                    <div class="vault-stat-label">Crossover Club</div>
                    <div class="vault-stat-value">${escapeHTML(player.crossover_club)}</div>
                </div>
                <div class="vault-stat-block">
                    <div class="vault-stat-label">Interstate Stats</div>
                    <div class="vault-stat-value">${escapeHTML(player.crossover_stats)}</div>
                </div>
            </div>
            <p class="vault-card-bio">${escapeHTML(player.bio)}</p>
            <div class="vault-card-trivia">
                <strong>🏛️ Trivia:</strong> ${escapeHTML(player.trivia)}
            </div>
        </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function getInitials(name) {
    return name.split(' ').map(function(w) { return w.charAt(0); }).join('').toUpperCase();
}

document.addEventListener('DOMContentLoaded', initApp);
