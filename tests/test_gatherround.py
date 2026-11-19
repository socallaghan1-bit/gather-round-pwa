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

    # 1. Test events.json (ONLY the 9 confirmed 2027 AFL Gather Round matches)
    events = load_json("events.json")
    print(f"Loaded {len(events)} events from events.json")
    assert len(events) == 9, f"Expected exactly 9 confirmed AFL matches, got {len(events)}"

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

    # 2. Categories (no unconfirmed placeholder categories remain)
    categories = set(e["category"] for e in events)
    assert categories == {"AFL Match"}, f"Expected only 'AFL Match' category, got {categories}"
    removed_categories = {"Parade & Festival", "Kids & Clinics", "Supporter Pubs", "The Outer"}
    assert categories.isdisjoint(removed_categories), f"Unconfirmed categories still present: {categories & removed_categories}"
    print(f"  [PASS] Confirmed-only category verified: {categories}")

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
    assert any("kensington" in g["id"] for g in defunct), "Missing Kensington Oval"
    assert any("jubilee" in g["id"] for g in defunct), "Missing Jubilee Oval"
    for g in defunct:
        assert "directions_url" in g, f"{g['id']} missing directions_url"
        assert "years_active" in g, f"{g['id']} missing years_active"
    print("  [PASS] Defunct grounds and former homes verified")

    # 5. Footy Heritage & Roots (verified SA footy folklore entries only)
    heritage = load_json("heritage.json")
    print(f"Loaded {len(heritage)} footy heritage sites")
    assert len(heritage) == 2, f"Expected exactly 2 verified Footy Roots entries, got {len(heritage)}"
    by_title = {h["title"]: h for h in heritage}
    assert "The Goodwin Tree (Herbig Family Tree)" in by_title, "Missing Herbig Family Tree entry"
    assert "The 2002 Ramsgate Rumble" in by_title, "Missing 2002 Ramsgate Rumble entry"
    assert by_title["The Goodwin Tree (Herbig Family Tree)"]["coords"] == "-34.6961,139.0936"
    assert by_title["The Goodwin Tree (Herbig Family Tree)"]["source_url"] == "https://www.germanaustralia.com/e/herbig.htm"
    assert by_title["The 2002 Ramsgate Rumble"]["coords"] == "-34.9203,138.4945"
    assert "foxsports.com.au" in by_title["The 2002 Ramsgate Rumble"]["source_url"]
    print("  [PASS] Footy roots verified (Herbig Family Tree & 2002 Ramsgate Rumble)")

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

    expected_zone_colors = {
        "west-adelaide": ("#800000", "#000000"),
        "north-adelaide": ("#FF2A2A", "#FFFFFF"),
        "norwood": ("#4A0E2E", "#002B5C"),
        "central-district": ("#0047AB", "#E31837"),
        "sturt": ("#38BDF8", "#002B5C"),
        "south-adelaide": ("#0B132B", "#FFFFFF"),
    }
    for label, geojson_doc in (("current", sanfl_curr), ("1990", sanfl_1990)):
        by_id = {f["properties"]["id"]: f["properties"] for f in geojson_doc["features"]}
        assert by_id["west-adelaide"]["nickname"] == "Bloods", f"West Adelaide ({label}) nickname should be 'Bloods'"
        assert "tars" not in by_id["west-adelaide"]["nickname"].lower()
        assert "Peter Darley" in by_id["south-adelaide"]["famous_players"], f"South Adelaide ({label}) should include Peter Darley"
        assert "Rick Davies" not in by_id["south-adelaide"]["famous_players"], f"South Adelaide ({label}) should not include Rick Davies"
        for club_id, (fill_col, stroke_col) in expected_zone_colors.items():
            assert by_id[club_id]["fillColor"] == fill_col, f"{club_id} ({label}) fillColor mismatch"
            assert by_id[club_id]["strokeColor"] == stroke_col, f"{club_id} ({label}) strokeColor mismatch"

    assert len(sanfl_1990["features"]) == 10, f"Expected 10 pre-1991 SANFL clubs, got {len(sanfl_1990['features'])}"
    required_props = {"id", "name", "nickname", "era", "home_oval", "description", "famous_players", "trivia", "fillColor", "strokeColor"}
    feats_1990 = {f["properties"]["id"]: f for f in sanfl_1990["features"]}
    for cid, feat in feats_1990.items():
        missing_props = required_props - set(feat["properties"].keys())
        assert not missing_props, f"1990 club {cid} missing properties: {missing_props}"
        polys = feat["geometry"]["coordinates"] if feat["geometry"]["type"] == "MultiPolygon" else [feat["geometry"]["coordinates"]]
        total_pts = sum(len(poly[0]) for poly in polys)
        assert total_pts >= 200, f"1990 club {cid} appears to be a low-vertex placeholder ({total_pts} pts)"
    assert feats_1990["woodville"]["geometry"] != feats_1990["west-torrens"]["geometry"], "Woodville and West Torrens must have distinct 1990 zones"
    print("  [PASS] Both SANFL Current and 1990 Pre-Crows GeoJSON files verified")

    # 8. Branding & Domain
    cname = open(os.path.join(root, "CNAME"), "r", encoding="utf-8").read().strip()
    assert cname == "mygatherround.app", f"CNAME is '{cname}', expected 'mygatherround.app'"

    manifest = load_json("manifest.json")
    assert manifest["name"] == "MyGatherRound.app — 2027 SA Footy & Heritage Guide"
    assert manifest["theme_color"] == "#0A192F"

    sw = open(os.path.join(root, "service-worker.js"), "r", encoding="utf-8").read()
    assert "gatherround-cache-v7" in sw, "service-worker CACHE_NAME should be gatherround-cache-v7"
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
    assert 'class="layer-pill active" id="layer-toggle-stadiums"' not in html, "Stadiums & Hubs pill should default to inactive"
    assert 'id="layer-toggle-sanfl-grounds"' in html and "SANFL Grounds" in html, "Missing SANFL Grounds layer pill in index.html"
    assert 'class="layer-pill active" id="layer-toggle-sanfl-grounds"' not in html, "SANFL Grounds pill should default to inactive"
    for empty_cat in ("Kids & Clinics", "Supporter Pubs", "The Outer", "Parade"):
        assert f'data-category="{empty_cat}" hidden' in html, f"Empty category pill '{empty_cat}' should be hidden by default"

    app_js = open(os.path.join(root, "app.js"), "r", encoding="utf-8").read()
    assert "stadiums: false" in app_js, "activeMapLayers.stadiums should default to false"
    assert "'sanfl-grounds': false" in app_js, "activeMapLayers['sanfl-grounds'] should default to false"
    for ground_name in (
        "Glenelg Oval", "Norwood Oval", "Prospect Oval", "Unley Oval",
        "Richmond Oval", "Woodville Oval", "Alberton Oval", "Elizabeth Oval", "Noarlunga Oval", "Thebarton Oval"
    ):
        assert f'name: "{ground_name}"' in app_js, f"Missing active SANFL ground '{ground_name}' in app.js"
    assert "syncCategoryFilterPills" in app_js, "app.js should dynamically sync empty category pills"
    assert "hasActiveEventMapFilter" in app_js, "app.js should gate default event markers until filter or Show on Map"
    assert "ANd9GcR110NNUAGbDufewTJHMdkyzYBLfDn3o0Mo7x2dl3JhBQ" in app_js, "app.js should contain Port Adelaide custom icon URL"
    assert "icons/grounds/glenelg.png" in app_js, "app.js should reference Glenelg ground icon"
    assert "icons/grounds/south-adelaide.png" in app_js, "app.js should reference South Adelaide ground icon"
    assert "icons/grounds/woodville-west-torrens.png" in app_js, "app.js should reference Woodville-West Torrens ground icon"
    assert "icons/grounds/adelaide-crows.jpg" in app_js, "app.js should reference Adelaide Crows ground icon"

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
