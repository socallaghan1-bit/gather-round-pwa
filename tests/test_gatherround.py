import json
import os
import sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_json(rel_path):
    with open(os.path.join(root, rel_path), "r", encoding="utf-8") as f:
        return json.load(f)

def run_tests():
    print("========================================")
    print("RUNNING MYGATHERROUND.APP TEST SUITE")
    print("========================================")

    # 1. Test events.json
    events = load_json("events.json")
    print(f"Loaded {len(events)} events from events.json")
    assert len(events) >= 20, f"Expected at least 20 events, got {len(events)}"

    # 9 Confirmed Matches
    matches = [e for e in events if e.get("category") == "AFL Match" or e.get("type") == "AFL Match"]
    print(f"Verified {len(matches)} AFL Matches")
    assert len(matches) == 9, f"Expected 9 matches, got {len(matches)}"

    expected_matches = [
        ("match-2027-01", "Adelaide Crows v Brisbane Lions", "2027-04-08", "Adelaide Oval"),
        ("match-2027-02", "Collingwood v Sydney Swans", "2027-04-09", "Adelaide Oval"),
        ("match-2027-03", "Gold Coast SUNS v GWS GIANTS", "2027-04-10", "Barossa Park"),
        ("match-2027-04", "Carlton v Melbourne", "2027-04-10", "Adelaide Oval"),
        ("match-2027-05", "Richmond v West Coast Eagles", "2027-04-10", "Norwood Oval"),
        ("match-2027-06", "Fremantle v Hawthorn", "2027-04-10", "Adelaide Oval"),
        ("match-2027-07", "Essendon v North Melbourne", "2027-04-11", "Norwood Oval"),
        ("match-2027-08", "Geelong Cats v St Kilda", "2027-04-11", "Barossa Park"),
        ("match-2027-09", "Port Adelaide v Western Bulldogs", "2027-04-11", "Adelaide Oval")
    ]

    for mid, title, date, venue_substr in expected_matches:
        m = next((x for x in matches if x["id"] == mid), None)
        assert m is not None, f"Missing match {mid}"
        assert m["title"] == title, f"Match {mid} title mismatch: {m['title']} != {title}"
        assert m["date"] == date, f"Match {mid} date mismatch: {m['date']} != {date}"
        assert venue_substr in m["venue"] or venue_substr in m["location"], f"Match {mid} venue mismatch"
        assert "ACST" in m["time_display"] and "AEST" in m["time_display"], f"Match {mid} missing ACST/AEST display"
        assert len(m["clubs"]) == 2, f"Match {mid} should list 2 clubs"
        print(f"  [PASS] {title} ({m['time_display']}) @ {m['venue']}")

    # 2. Categories
    categories = set(e["category"] for e in events)
    expected_categories = {"AFL Match", "Parade & Festival", "Kids & Clinics", "Supporter Pubs", "The Outer"}
    assert expected_categories.issubset(categories), f"Missing categories: {expected_categories - categories}"
    print(f"  [PASS] Curated categories verified: {categories}")

    # 3. 18 Clubs Presence
    all_clubs = [
        "Adelaide Crows", "Brisbane Lions", "Carlton", "Collingwood",
        "Essendon", "Fremantle", "Geelong Cats", "Gold Coast SUNS",
        "GWS GIANTS", "Hawthorn", "Melbourne", "North Melbourne",
        "Port Adelaide", "Richmond", "St Kilda", "Sydney Swans",
        "West Coast Eagles", "Western Bulldogs"
    ]
    for club in all_clubs:
        club_events = [e for e in events if any(c.lower() == club.lower() for c in e.get("clubs", []))]
        assert len(club_events) >= 1, f"Club {club} has no mapped events"
    print(f"  [PASS] All 18 AFL clubs have associated events for filtering")

    # 4. Defunct Grounds
    defunct = load_json("defunct-grounds.json")
    print(f"Loaded {len(defunct)} defunct grounds")
    assert any("football-park" in g["id"] for g in defunct), "Missing Football Park (AAMI Stadium)"
    assert any("thebarton" in g["id"] for g in defunct), "Missing Thebarton Oval"
    assert any("woodville" in g["id"] for g in defunct), "Missing Woodville Oval"
    assert any("kensington" in g["id"] for g in defunct), "Missing Kensington Oval"
    assert any("jubilee" in g["id"] for g in defunct), "Missing Jubilee Oval"
    for g in defunct:
        assert "directions_url" in g, f"{g['id']} missing directions_url"
        assert "years_active" in g, f"{g['id']} missing years_active"
    print("  [PASS] Defunct grounds and former homes verified")

    # 5. Footy Heritage & Roots
    heritage = load_json("heritage.json")
    print(f"Loaded {len(heritage)} footy heritage sites")
    assert any("christies-beach" in h["id"] for h in heritage), "Missing Christies Beach Craig McRae roots"
    assert any("eden-valley" in h["id"] for h in heritage), "Missing Eden Valley Simon Goodwin roots"
    assert any("alberton" in h["id"] for h in heritage), "Missing Alberton Oval"
    assert any("unley" in h["id"] for h in heritage), "Missing Unley Oval"
    assert any("prospect" in h["id"] for h in heritage), "Missing Prospect Oval"
    assert any("glenelg" in h["id"] for h in heritage), "Missing Glenelg Oval"
    assert any("norwood" in h["id"] for h in heritage), "Missing Norwood Oval"
    assert any("richmond" in h["id"] for h in heritage), "Missing Richmond Oval"
    assert any("elizabeth" in h["id"] for h in heritage), "Missing Elizabeth Oval"
    print("  [PASS] Footy roots and SANFL suburban shrines verified")

    # 6. Facilities
    facilities = load_json("facilities.json")
    print(f"Loaded {len(facilities)} matchday spectator facilities")
    toilets = [f for f in facilities if f["type"] == "toilet"]
    water = [f for f in facilities if f["type"] == "water"]
    assert len(toilets) >= 3, "Expected at least 3 toilet locations"
    assert len(water) >= 3, "Expected at least 3 water refill locations"
    print("  [PASS] Match-day facilities verified")

    # 7. GeoJSON SANFL Zones
    sanfl_curr = load_json("data/sanfl-zones-current.geojson")
    sanfl_1990 = load_json("data/sanfl-zones-1990.geojson")
    assert sanfl_curr["type"] == "FeatureCollection"
    assert sanfl_1990["type"] == "FeatureCollection"
    assert any("wwt-eagles" in f["properties"]["id"] for f in sanfl_curr["features"]), "Missing WWT Eagles current zone"
    assert any("woodville" in f["properties"]["id"] for f in sanfl_1990["features"]), "Missing Woodville 1990 zone"
    assert any("west-torrens" in f["properties"]["id"] for f in sanfl_1990["features"]), "Missing West Torrens 1990 zone"
    print("  [PASS] Both SANFL Current and 1990 Pre-Crows GeoJSON files verified")

    # 8. Branding & Domain
    cname = open(os.path.join(root, "CNAME"), "r", encoding="utf-8").read().strip()
    assert cname == "mygatherround.app", f"CNAME is '{cname}', expected 'mygatherround.app'"

    manifest = load_json("manifest.json")
    assert manifest["name"] == "MyGatherRound.app — 2027 SA Footy & Heritage Guide"
    assert manifest["theme_color"] == "#0A192F"

    sw = open(os.path.join(root, "service-worker.js"), "r", encoding="utf-8").read()
    assert "gatherround-cache-v6" in sw, "service-worker CACHE_NAME should be gatherround-cache-v6"
    assert "defunct-grounds.json" in sw
    assert "heritage.json" in sw
    assert "facilities.json" in sw
    assert "sanfl-zones-current.geojson" in sw
    assert "sanfl-zones-1990.geojson" in sw

    html = open(os.path.join(root, "index.html"), "r", encoding="utf-8").read()
    assert "MyGatherRound.app" in html
    assert "buymeacoffee.com/mygatherround" in html
    assert "callas1894@gmail.com?subject=MyGatherRound" in html
    assert "🥧 Buy Me a Pie Floater" in html

    admin = open(os.path.join(root, "admin.html"), "r", encoding="utf-8").read()
    assert "GATHER_SPONSORS" in admin
    assert "Barossa / Footy Express Alert" in admin or "Footy Express Alert" in admin
    assert "Players Parade Starting" in admin
    assert "Gates Open / Bounce Soon" in admin
    assert "The Outer" in admin

    print("========================================")
    print("ALL TESTS PASSED! READY FOR GATHER ROUND 2027!")
    print("========================================")

if __name__ == "__main__":
    run_tests()
