/**
 * MyGatherRound.app — 2027 SA Footy & Heritage Guide
 * Offline-first spectator & heritage companion for AFL Gather Round 2027 in South Australia.
 */

let allEvents = [];
let currentDayFilter = 'All';
let currentLumaFilter = 'All';
let currentClubFilter = 'All';
let currentSearchQuery = '';

const ADELAIDE_COORDS = { latitude: -34.9155, longitude: 138.5961 };
const WEATHER_CACHE_KEY = 'gatherWeatherSummaryV1';
const AUDIO_FEEDBACK_KEY = 'gatherAudioFeedback';
const PASSPORT_STORAGE_KEY = 'gatherPassportCheckinsV1';
const SAVED_EVENTS_KEY = 'gather_saved_events';
const LEGACY_SAVED_EVENTS_KEY = 'savedTDU';
let audioFeedbackContext = null;

const WEATHER_PLACEHOLDER = 'Today in Adelaide: Checking weather…';
const WEATHER_UNAVAILABLE = 'Weather unavailable';

const getHaptics = () => window.GatherHaptics || window.TDUHaptics || null;
const getCelebrate = () => window.GatherCelebrate || window.TDUCelebrate || null;

// Leaflet Map & Layer Groups
let scheduleMap = null;
let scheduleMapResizeObserver = null;
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

// Active Overlay Layers State (all default OFF to keep initial map clean)
const activeMapLayers = {
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
    name: 'Adelaide Oval',
    type: 'stadium',
    role: 'Main Stadium (53,500 capacity)',
    coords: [-34.9155, 138.5961],
    address: 'War Memorial Drive, North Adelaide SA',
    details: 'Hosting 5 blockbuster matches. Free Footy Express bus, train, and tram travel included with AFL ticket.',
    icon: 'fa-monument',
    color: '#C8102E'
  },
  {
    name: 'Norwood Oval (Coopers Stadium)',
    type: 'stadium',
    role: 'Historic Suburban Match Venue (10,000 capacity)',
    coords: [-34.9213, 138.6347],
    address: 'The Parade, Norwood SA',
    details: 'Hosting 2 matches: Richmond v West Coast and Essendon v North Melbourne. Fan festival zones along The Parade.',
    icon: 'fa-monument',
    color: '#C8102E'
  },
  {
    name: 'Barossa Park, Lyndoch',
    type: 'stadium',
    role: 'Wine Country Match Venue',
    coords: [-34.6045, 138.8925],
    address: 'Barossa Valley Way, Lyndoch SA',
    details: 'Hosting 2 matches: Suns v Giants and Cats v Saints. Dedicated Barossa Express shuttles run from Adelaide CBD & Gawler.',
    icon: 'fa-monument',
    color: '#C8102E'
  },
  {
    name: 'Elder Park Footy Festival Hub',
    type: 'hub',
    role: 'Central Fan Festival Precinct',
    coords: [-34.9192, 138.5992],
    address: 'King William Road, Adelaide Riverbank',
    details: 'Open daily from 10am. Giant broadcast screens, all 18 club merchandise superstores, player signings, SA food trucks, and nightly fireworks.',
    icon: 'fa-flag',
    color: '#FFB81C'
  },
  {
    name: 'King William St & Currie St Footy Express Hub',
    type: 'hub',
    role: 'Primary City Bus Interchange',
    coords: [-34.9255, 138.5997],
    address: 'Currie St & King William St, Adelaide CBD',
    details: 'Free Footy Express matchday buses depart continuously for Adelaide Oval and Norwood Oval.',
    icon: 'fa-bus',
    color: '#0A192F'
  },
  {
    name: 'Adelaide Railway Station Footy Express Hub',
    type: 'hub',
    role: 'Train & Riverbank Footbridge Connection',
    coords: [-34.9216, 138.5950],
    address: 'North Terrace, Adelaide CBD',
    details: 'Free train travel with game ticket. Undercover walk across Riverbank Footbridge directly to Adelaide Oval South Gate.',
    icon: 'fa-train',
    color: '#0A192F'
  },
  {
    name: 'Gawler Central Station — Barossa Shuttle Link',
    type: 'hub',
    role: 'Gawler Train Line to Lyndoch Coach Hub',
    coords: [-34.5960, 138.7470],
    address: 'Overway Bridge Road, Gawler SA',
    details: 'Catch the Gawler train from Adelaide, then hop onto dedicated Barossa Park shuttle coaches into Lyndoch.',
    icon: 'fa-bus',
    color: '#0A192F'
  },
  {
    name: 'Tanunda Town Square & Shuttle Hub',
    type: 'hub',
    role: 'Barossa Food Village & Visitor Centre',
    coords: [-34.5240, 138.9600],
    address: 'Murray Street, Tanunda SA',
    details: 'Saturday post-match Food & Wine Village (4pm–10pm). Regional bus connections and local tasting pavilions.',
    icon: 'fa-bus',
    color: '#0A192F'
  }
];

// Active SANFL Club Home Grounds
const SANFL_GROUNDS = [
  {
    id: 'sanfl-ground-glenelg',
    name: 'Glenelg Oval',
    venue_alias: 'Stratarama Stadium',
    club: 'Glenelg Tigers',
    coords: [-34.9834, 138.5216],
    address: 'Brighton Road & Williams Avenue, Glenelg East SA 5045',
    details: 'Seaside fortress of the Glenelg Football Club since 1921, celebrated for its Brighton Road outer hill, heritage grandstands, and Tigers clubrooms.',
    color: '#FFB81C',
    textColor: '#0A192F',
    iconColor: '#0A192F'
  },
  {
    id: 'sanfl-ground-norwood',
    name: 'Norwood Oval',
    venue_alias: 'Coopers Stadium',
    club: 'Norwood Redlegs',
    coords: [-34.9198, 138.6305],
    address: '4 Woods Street (off The Parade), Norwood SA 5067',
    details: 'Home of the 31-time SANFL premier Norwood Redlegs since 1901 and intimate AFL Gather Round suburban match venue in the heart of The Parade.',
    color: '#4A0E2E'
  },
  {
    id: 'sanfl-ground-prospect',
    name: 'Prospect Oval',
    venue_alias: 'Prospect Oval',
    club: 'North Adelaide Roosters',
    coords: [-34.8856, 138.6009],
    address: 'Menzies Crescent, Prospect SA 5082',
    details: 'Suburban home of the North Adelaide Roosters since 1922, where Barrie Robran starred and Ken Farmer kicked a record 1,417 SANFL career goals.',
    color: '#FF2A2A'
  },
  {
    id: 'sanfl-ground-unley',
    name: 'Unley Oval',
    venue_alias: 'Thomas Farms Oval',
    club: 'Sturt Double Blues',
    coords: [-34.9502, 138.6120],
    address: 'Trimmer Terrace & Langham Terrace, Unley SA 5061',
    details: 'Tree-lined spiritual home of the Sturt Double Blues since 1901, where coach Jack Oatey forged five consecutive SANFL premierships (1966–1970).',
    color: '#38BDF8',
    textColor: '#002B5C',
    iconColor: '#002B5C'
  },
  {
    id: 'sanfl-ground-richmond',
    name: 'Richmond Oval',
    venue_alias: 'Hisense Stadium',
    club: 'West Adelaide Bloods',
    coords: [-34.9377, 138.5683],
    address: '57 Milner Road, Richmond SA 5033',
    details: "Inner-west headquarters of the West Adelaide Bloods since 1958, renowned for its classic suburban terraces and Neil Kerley's premiership sides.",
    color: '#800000'
  },
  {
    id: 'sanfl-ground-woodville',
    name: 'Woodville Oval',
    venue_alias: 'Maughan Thiem Kia Oval',
    club: 'Woodville-West Torrens Eagles',
    coords: [-34.8881, 138.5383],
    address: 'Oval Avenue, Woodville South SA 5011',
    details: 'Primary home ground of the merged Woodville-West Torrens Eagles since 1991 (and home of the standalone Woodville Warriors from 1964 to 1990).',
    color: '#005A36'
  },
  {
    id: 'sanfl-ground-alberton',
    name: 'Alberton Oval',
    venue_alias: 'Alberton Oval',
    club: 'Port Adelaide Magpies',
    coords: [-34.8644, 138.5195],
    address: 'Queen Street & Brougham Place, Alberton SA 5014',
    details: "Port Adelaide's spiritual home since 1880, featuring the Fos Williams bronze statue, historic Bob Quinn Grandstand, and club museum.",
    color: '#0A192F'
  },
  {
    id: 'sanfl-ground-elizabeth',
    name: 'Elizabeth Oval',
    venue_alias: 'X Convenience Oval',
    club: 'Central District Bulldogs',
    coords: [-34.7241, 138.6627],
    address: '10 Goodman Road, Elizabeth SA 5112',
    details: 'Northern suburbs fortress of the Central District Bulldogs since 1964, powerhouse home to nine SANFL premierships between 2000 and 2010.',
    color: '#0047AB'
  },
  {
    id: 'sanfl-ground-noarlunga',
    name: 'Noarlunga Oval',
    venue_alias: 'Magain Stadium (Flinders University Stadium)',
    club: 'South Adelaide Panthers',
    coords: [-35.1454, 138.4929],
    address: '1 Lovelock Drive, Noarlunga Downs SA 5168',
    details: 'Southern suburbs home ground of the foundation South Adelaide Panthers since 1995, overlooking the Onkaparinga hills and southern coast.',
    color: '#0B132B'
  },
  {
    id: 'sanfl-ground-thebarton',
    name: 'Thebarton Oval',
    venue_alias: 'Thebarton Oval Precinct',
    club: 'Adelaide Crows',
    coords: [-34.9178, 138.5736],
    address: '1 Meyer Street, Torrensville SA 5031',
    details: 'State-of-the-art training and match-day headquarters for the Adelaide Crows AFLW and community development programs.',
    color: '#002B5C'
  }
];

const GROUND_ICON_MAP = {
  'sanfl-ground-thebarton': { src: 'icons/grounds/adelaide-crows.jpg', alt: 'Adelaide Crows' },
  'sanfl-ground-unley': { src: 'icons/grounds/sturt.png', alt: 'Sturt' },
  'sanfl-ground-norwood': { src: 'icons/grounds/norwood.png', alt: 'Norwood' },
  'sanfl-ground-elizabeth': { src: 'icons/grounds/central-district.jpg', alt: 'Central District' },
  'sanfl-ground-prospect': { src: 'icons/grounds/north-adelaide.png', alt: 'North Adelaide' },
  'sanfl-ground-richmond': { src: 'icons/grounds/west-adelaide.png', alt: 'West Adelaide' },
  'sanfl-ground-glenelg': { src: 'icons/grounds/glenelg.png', alt: 'Glenelg' },
  'sanfl-ground-noarlunga': { src: 'icons/grounds/south-adelaide.png', alt: 'South Adelaide' },
  'sanfl-ground-woodville': { src: 'icons/grounds/woodville-west-torrens.png', alt: 'Woodville-West Torrens' }
};

const VIEW_ANALYTICS_CONFIG = {
  home: { page_title: 'MyGatherRound 2027 - Home', page_path: '' },
  schedule: { page_title: 'MyGatherRound 2027 - Fixture & Map', page_path: 'schedule' },
  saved: { page_title: 'MyGatherRound 2027 - My Weekend', page_path: 'my-weekend' },
  vault: { page_title: 'MyGatherRound 2027 - Footy Vault', page_path: 'vault' },
  settings: { page_title: 'MyGatherRound 2027 - Settings', page_path: 'settings' }
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
      if (val !== undefined && val !== null) sanitizedParams[key] = val;
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

    const legacy = JSON.parse(localStorage.getItem(LEGACY_SAVED_EVENTS_KEY) || 'null');
    if (Array.isArray(legacy)) {
      const migrated = Array.from(new Set(legacy.map(String)));
      localStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_SAVED_EVENTS_KEY);
      return migrated;
    }
    return [];
  } catch (e) {
    return [];
  }
}

function saveSavedEvents(eventsArray) {
  try {
    const clean = Array.from(new Set(eventsArray.map(String)));
    localStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(clean));
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
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'unsave') {
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(440.00, now + 0.12);
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

window.toggleAudioFeedback = function () {
  const nextState = !isAudioFeedbackEnabled();
  setAudioFeedbackEnabled(nextState);
  if (nextState) playAudioCue('save');
};

// Weather Widget (with offline localStorage cache)
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
      const summary = `Today in Adelaide: ${temp}°C, ${desc} • Wind ${wind} km/h`;
      try {
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ summary, savedAt: Date.now() }));
      } catch (_) {}
      renderWeatherWidget(summary);
      return;
    }
    throw new Error(WEATHER_UNAVAILABLE);
  } catch (err) {
    try {
      const cached = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || 'null');
      if (cached && cached.summary) {
        renderWeatherWidget(`${cached.summary} (cached)`);
        return;
      }
    } catch (_) {}
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
      const celebrate = getCelebrate();
      if (celebrate && celebrate.calendarConfetti) celebrate.calendarConfetti();
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
  const celebrate = getCelebrate();
  if (celebrate && celebrate.calendarConfetti) celebrate.calendarConfetti();
  return true;
}

window.exportSavedEvents = async function () {
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

window.exportEventToCalendar = async function (eventId) {
  const event = allEvents.find((e) => String(e.id) === String(eventId));
  if (!event) return;
  await exportEventsToCalendar([event], `gather_round_${event.id}.ics`);
};
window.exportStageToCalendar = window.exportEventToCalendar;

window.shareItinerary = async function () {
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
    showToast('🔗 Itinerary deep link copied to clipboard!', { type: 'success' });
  }
};

// Toast notification helper
function showToast(message, options = {}) {
  let container = document.getElementById('app-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'app-toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  container.innerHTML = '';
  const toast = document.createElement('div');
  const variant = options.type === 'success' || options.type === 'info' ? ` ${options.type}` : '';
  toast.className = `toast-pill${variant}`;
  toast.innerHTML = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));
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

window.handleEventCheckIn = function (eventId, btnEl) {
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
    renderFanPassportWidget();
    return;
  }

  checkins.push({ id: strId, timestamp: new Date().toISOString() });
  localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(checkins));
  if (btnEl) {
    btnEl.classList.add('checked-in');
    btnEl.innerHTML = '<i class="fas fa-check-circle" aria-hidden="true"></i> Checked In';
  }
  playAudioCue('checkin');
  showToast('📍 <strong>Checked in!</strong> Added to your Fan Passport.', { type: 'success' });
  renderFanPassportWidget();
};

function renderFanPassportWidget() {
  const container = document.getElementById('saved-events-container');
  const existingPassport = document.getElementById('fan-passport-widget');
  if (existingPassport) existingPassport.remove();

  const checkins = getCheckins();
  const unlockedBadges = PASSPORT_BADGES.filter((b) => b.check(checkins, allEvents));
  const completionPct = Math.round((unlockedBadges.length / PASSPORT_BADGES.length) * 100);

  const passportHTML = `
    <div class="passport-widget" id="fan-passport-widget">
      <div class="passport-header">
        <div class="passport-brand">
          <span class="passport-icon" aria-hidden="true">🏉</span>
          <div>
            <h3>Footy Fan Passport</h3>
            <p class="passport-subtitle">${checkins.length} venue check-in${checkins.length === 1 ? '' : 's'} logged</p>
          </div>
        </div>
        <span class="passport-stats-pill">${unlockedBadges.length}/${PASSPORT_BADGES.length} Badges</span>
      </div>
      <div class="passport-progress-row">
        <div class="passport-progress-label">
          <span>Weekend Completion</span>
          <strong>${completionPct}%</strong>
        </div>
        <div class="passport-progress-bar">
          <div class="passport-progress-fill" style="width:${completionPct}%;"></div>
        </div>
      </div>
      <div class="passport-badges-grid">
        ${PASSPORT_BADGES.map((badge) => {
          const isUnlocked = unlockedBadges.some((b) => b.id === badge.id);
          return `
            <div class="passport-badge-card ${isUnlocked ? 'unlocked' : 'locked'}">
              <div class="badge-icon-box" aria-hidden="true">${badge.icon}</div>
              <div class="badge-info">
                <div class="badge-title-row">
                  <h4 class="badge-title">${escapeHTML(badge.title)}</h4>
                  <span class="badge-status-pill ${isUnlocked ? '' : 'locked-pill'}">${isUnlocked ? 'Earned' : 'Locked'}</span>
                </div>
                <p class="badge-desc">${escapeHTML(badge.description)}</p>
              </div>
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
      ${result.matches.slice(0, 3).map(({ event }) => `
        <div class="recommendation-card">
          <div class="recommendation-title"><strong>${escapeHTML(event.title)}</strong></div>
          <div class="recommendation-meta">${event.time_display ? escapeHTML(event.time_display) : formatDate(event.date)} • ${escapeHTML(event.location || '')}</div>
          <button type="button" class="btn btn-primary recommendation-action" onclick="panMapToEvent('${escapeHTML(event.id)}')">Show on Map →</button>
        </div>
      `).join('')}
    </div>
  `;
}

window.openRecommendationFlow = function () {
  recommendationState.isOpen = true;
  renderRecommendationFlow();
  trackAnalyticsEvent('open_recommendation_flow');
};

window.selectRecommendationIntent = function (intent) {
  recommendationState.isOpen = true;
  recommendationState.intent = intent;
  recommendationState.option = '';
  renderRecommendationFlow();
};

window.selectRecommendationOption = function (optionId) {
  recommendationState.option = optionId;
  renderRecommendationFlow();
};

window.goBackRecommendation = function () {
  recommendationState.option = '';
  recommendationState.intent = '';
  renderRecommendationFlow();
};

window.resetRecommendationFlow = function () {
  recommendationState.isOpen = false;
  recommendationState.intent = '';
  recommendationState.option = '';
  renderRecommendationFlow();
};

// Data Fetching & Remote Sponsor Integration
const PUSH_BACKEND_BASE = 'https://gr-push-backend.mytdu-push.workers.dev';

function getSafeSponsorUrl(value) {
  try {