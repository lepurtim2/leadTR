import duckdb
import os
import json

con = duckdb.connect()
con.execute("LOAD spatial;")
pbf_path = "data/turkey-latest.osm.pbf"

query = f"""
SELECT 
    osm_id,
    name,
    phone,
    website,
    other_tags,
    ST_X(geom) as lon,
    ST_Y(geom) as lat
FROM ST_Read('{pbf_path.replace(os.sep, "/")}', layer='points')
WHERE name IS NOT NULL
  AND length(trim(name)) >= 3
  AND amenity IS NULL
  AND shop IS NULL
  AND office IS NULL
  AND leisure IS NULL
  AND tourism IS NULL
  AND craft IS NULL
  AND other_tags IS NOT NULL
  AND (
    other_tags LIKE '%"industrial"%'
    OR other_tags LIKE '%"commercial"%'
    OR other_tags LIKE '%"factory"%'
    OR other_tags LIKE '%"company"%'
    OR other_tags LIKE '%"branch"%'
    OR other_tags LIKE '%"operator"%'
    OR other_tags LIKE '%"brand"%'
    OR other_tags LIKE '%"contact:phone"%'
    OR other_tags LIKE '%"contact:email"%'
    OR other_tags LIKE '%"contact:website"%'
    OR other_tags LIKE '%"phone"%'
    OR other_tags LIKE '%"website"%'
  )
LIMIT 20;
"""

rows = con.execute(query).fetchall()
print(f"Sample 20 Unharvested Records:")
for r in rows:
    osm_id, name, phone, website, other_tags, lon, lat = r
    print(f"[{osm_id}] {name} | Phone: {phone} | Web: {website} | Tags: {other_tags[:120]}... | Coord: ({lat:.4f}, {lon:.4f})")
con.close()
