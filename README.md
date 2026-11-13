# MyGatherRound.app — 2027 SA Footy & Heritage Guide
An independent, offline-first spectator & heritage companion for **AFL Gather Round 2027 (Thursday 8 April – Sunday 11 April 2027)** in South Australia.

Explore all 9 confirmed AFL matches, interactive SANFL recruiting territory overlays (Modern vs. 1990 Pre-Crows Era), iconic defunct grounds (such as Football Park, Thebarton Oval, and Woodville Oval), grassroots Outer community fixtures, and interstate club supporter pub takeovers across Adelaide CBD, Norwood, and the Barossa Valley.

---

## 🌟 Key Features

### 1. Confirmed 2027 AFL Fixture & Off-Broadway Events
- **All 9 Confirmed Matches** across Adelaide Oval, Norwood Oval (Coopers Stadium), and Barossa Park (Lyndoch).
- **Dual Timezone Display**: Local Adelaide ACST (UTC+9:30) and Australian Eastern AEST (UTC+10:00).
- **Curated Event Categories**:
  - `AFL Match` (All 9 marquee games)
  - `Parade & Festival` (Inaugural Friday 18-Club CBD Players Parade, Elder Park Festival, Barossa Food & Wine Village)
  - `Kids & Clinics` (Auskick super-clinics & open training at historic SANFL grounds: Norwood, Glenelg, Alberton, Prospect, Unley)
  - `Supporter Pubs` (Interstate club hotel takeovers & matchday bases)
  - `The Outer` (Adelaide Footy League & SAAFL showcase matches, club legend speaker nights, live podcast recordings)

### 2. Zero-Login Filtering & Personal Offline Itinerary
- **18-Club Filter Bar**: Instant filtering for fans of all 18 AFL clubs.
- **Category Filter Pills**: Quick toggle between Matches, Clinics, Pubs, The Outer, and Parade.
- **Date Filter Pills**: All Days, Thu 8 Apr, Fri 9 Apr, Sat 10 Apr, Sun 11 Apr.
- **`⭐ My Weekend` Star Toggle**: 1-tap save to `localStorage` enabling a fully offline personal itinerary, complete with .ics calendar export and deep-link sharing.

### 3. Interactive Leaflet Map & Heritage Layers
- **Stadiums & Footy Express Hubs (Default On)**: Adelaide Oval, Norwood Oval, Barossa Park Lyndoch, Elder Park Festival, and major Footy Express interchanges (King William/Currie St, Adelaide Railway Station, Gawler Station Shuttle Link, Tanunda).
- **SANFL Recruiting Zones (Mutually Exclusive Overlay)**:
  - `[ 🛡️ SANFL Zones (Current) ]`: Color-coded metropolitan zones for Norwood, Port Adelaide, Sturt, Glenelg, North Adelaide, South Adelaide, Central District, West Adelaide, and Woodville-West Torrens.
  - `[ 🕰️ SANFL Zones (1990 Pre-Crows) ]`: Historic standalone boundaries featuring separate Woodville Warriors (green & gold) and West Torrens Eagles (blue & gold) zones with the 1991 merger lore.
- **`[ 🏟️ Defunct Grounds ]`**: Football Park (AAMI Stadium West Lakes), Thebarton Oval, Woodville Oval, Kensington Oval, and Jubilee Oval.
- **`[ 🏛️ Footy Roots ]`**: Craig McRae's junior grassroots oval at Christies Beach, Simon Goodwin's Barossa origins, Alberton Oval, Unley Oval, Prospect Oval, Glenelg Oval, etc.
- **`[ 🚻 Toilets ]` & `[ 💧 Water Refills ]`**: Matchday amenities across Adelaide Oval, Norwood Parade, and Barossa Park.

### 4. Admin Dispatcher & Remote Sponsor Cards
- **Cloudflare Worker KV Key (`GATHER_SPONSORS`)**: Publish remote **Pub Takeover / Partner Spotlight** cards without code redeployments.
- **1-Tap Push Presets**:
  - `[ 🚌 Footy Express Alert ]`
  - `[ 🎉 Players Parade Starting ]`
  - `[ 🏟️ Gates Open / Bounce Soon ]`
  - `[ 🍻 The Outer ]`

### 5. Community & Support
- **Support CTA**: **"🥧 Buy Me a Pie Floater"** linking to `https://buymeacoffee.com/mygatherround`.
- **Partner Inquiries**: `callas1894@gmail.com?subject=MyGatherRound Partner Inquiry`.

---

## 🧪 Testing & Validation

Run the Python verification test suite:
```powershell
python tests/test_gatherround.py
```
Or run the Node test runner:
```bash
node --test tests/schedule-map.test.cjs
```
