# Schema

## Draft (`pending/*.json`)

```json
{
  "schema": "morgan.travelers.bus-shape.v1",
  "status": "pending_review",
  "id": "kmb_e42_pok_hong_airport_gtc",
  "agency": "KMB",
  "route_short_name": "E42",
  "route_id_match": ["E42"],
  "from_match": ["pok hong"],
  "to_match": ["airport (gtc)"],
  "direction": "O",
  "notes": "",
  "coordinates": [[114.19, 22.37], [113.93, 22.31]],
  "visual_stops": [
    {
      "stop_id": "…",
      "name": "…",
      "seq": 0,
      "official": [114.19, 22.37],
      "visual": [114.19, 22.37]
    }
  ],
  "contributor": "",
  "contributor_email": "",
  "submitted_at": "2026-08-01T00:00:00.000Z",
  "app_version": "0.4.0"
}
```

## Published (`bus-shapes/<id>.json`) — one file per route

```json
{
  "id": "kmb_e42_pok_hong_airport_gtc",
  "status": "published",
  "agency": "KMB",
  "route_short_name": "E42",
  "from_match": ["pok hong"],
  "to_match": ["airport (gtc)"],
  "direction": "O",
  "coordinates": [[lon, lat], …],
  "visual_stops": […],
  "published_at": "2026-08-01"
}
```

## Index (`bus-shapes/index.json`)

```json
{
  "updated_at": "2026-08-01",
  "note": "Published bus path overrides — one JSON file per route.",
  "files": ["kmb_e42_pok_hong_airport_gtc.json", "…"]
}
```

## Stub (`bus-shapes.json`)

```json
{
  "updated_at": "2026-08-01",
  "note": "Contributed routes live in bus-shapes/<id>.json (see split_index). …",
  "split_index": "bus-shapes/index.json",
  "files": ["…"],
  "routes": []
}
```

Older clients that fetch the blob URL see `routes: []` plus `split_index` and
fall back to their bundled split copy instead of reading stale data.

Coordinates are GeoJSON order: **`[longitude, latitude]`**.
