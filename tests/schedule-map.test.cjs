const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.join(__dirname, '..');
const events = JSON.parse(fs.readFileSync(path.join(root, 'events.json'), 'utf8'));
const defunctGrounds = JSON.parse(fs.readFileSync(path.join(root, 'defunct-grounds.json'), 'utf8'));
const heritageSites = JSON.parse(fs.readFileSync(path.join(root, 'heritage.json'), 'utf8'));
const facilities = JSON.parse(fs.readFileSync(path.join(root, 'facilities.json'), 'utf8'));
const sanflCurrent = JSON.parse(fs.readFileSync(path.join(root, 'data', 'sanfl-zones-current.geojson'), 'utf8'));
const sanfl1990 = JSON.parse(fs.readFileSync(path.join(root, 'data', 'sanfl-zones-1990.geojson'), 'utf8'));

test('Gather Round 2027 contains all 9 confirmed AFL matches', () => {
    const matches = events.filter((e) => e.category === 'AFL Match' || e.type === 'AFL Match');
    assert.equal(matches.length, 9, 'Should have exactly 9 confirmed AFL matches');

    const expectedMatchIds = [
        'match-2027-01', 'match-2027-02', 'match-2027-03',
        'match-2027-04', 'match-2027-05', 'match-2027-06',
        'match-2027-07', 'match-2027-08', 'match-2027-09'
    ];
    expectedMatchIds.forEach((id) => {
        const found = matches.find((m) => m.id === id);
        assert.ok(found, `Missing match with id ${id}`);
        assert.ok(found.time_display.includes('ACST'), `Match ${id} should display ACST time`);
        assert.ok(found.time_display.includes('AEST'), `Match ${id} should display AEST time`);
    });
});

test('Events contain only confirmed AFL Match entries and no speculative side-events', () => {
    assert.equal(events.length, 9, 'events.json should only contain the 9 confirmed matches');
    const categories = new Set(events.map((e) => e.category));
    assert.deepEqual([...categories], ['AFL Match']);
    assert.ok(!categories.has('Kids & Clinics'));
    assert.ok(!categories.has('Supporter Pubs'));
});

test('All events have valid South Australia geographic coordinates', () => {
    events.forEach((event) => {
        assert.ok(event.coords, `Event ${event.id} missing coords`);
        const parts = event.coords.split(',').map((p) => parseFloat(p.trim()));
        assert.equal(parts.length, 2, `Event ${event.id} coords invalid format`);
        const [lat, lng] = parts;
        assert.ok(lat < -33.5 && lat > -36.0, `Event ${event.id} latitude ${lat} outside SA range`);
        assert.ok(lng > 137.5 && lng < 140.5, `Event ${event.id} longitude ${lng} outside SA range`);
    });
});

test('SANFL GeoJSON feature collections are valid and contain key zones', () => {
    assert.equal(sanflCurrent.type, 'FeatureCollection');
    assert.ok(sanflCurrent.features.length >= 8, 'Current SANFL should have at least 8 zones');
    const wwtCurrent = sanflCurrent.features.find((f) => f.properties.id.includes('wwt-eagles'));
    assert.ok(wwtCurrent, 'Current SANFL should feature Woodville-West Torrens');

    assert.equal(sanfl1990.type, 'FeatureCollection');
    const woodville1990 = sanfl1990.features.find((f) => f.properties.id.includes('woodville'));
    const westTorrens1990 = sanfl1990.features.find((f) => f.properties.id.includes('west-torrens'));
    assert.ok(woodville1990, '1990 layer should have standalone Woodville Warriors');
    assert.ok(westTorrens1990, '1990 layer should have standalone West Torrens Eagles');
});

test('Defunct grounds and heritage sites include key historic venues', () => {
    const footyPark = defunctGrounds.find((g) => g.id.includes('football-park'));
    assert.ok(footyPark, 'Should contain Football Park (AAMI Stadium, West Lakes)');
    assert.ok(defunctGrounds.some((g) => g.id.includes('thebarton')));
    assert.ok(defunctGrounds.some((g) => g.id.includes('woodville')));
    assert.ok(defunctGrounds.some((g) => g.id.includes('kensington')));
    assert.ok(defunctGrounds.some((g) => g.id.includes('jubilee')));

    assert.equal(heritageSites.length, 2, 'Footy Roots should only contain the 2 verified folklore entries');
    assert.ok(heritageSites.some((h) => h.title === 'The Goodwin Tree (Herbig Family Tree)'), 'Should feature The Goodwin Tree (Herbig Family Tree)');
    assert.ok(heritageSites.some((h) => h.title === 'The 2002 Ramsgate Rumble'), 'Should feature The 2002 Ramsgate Rumble');
});

test('Date filters in index.html match Gather Round 2027 dates', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    ['2027-04-08', '2027-04-09', '2027-04-10', '2027-04-11'].forEach((d) => {
        assert.ok(html.includes(`applyDayFilter('${d}', this)`), `index.html should have filter for ${d}`);
    });
    assert.ok(html.includes('mygatherround.app'), 'index.html should feature mygatherround.app');
    assert.ok(html.includes('buymeacoffee.com/mygatherround'), 'Support link should point to mygatherround');
});
