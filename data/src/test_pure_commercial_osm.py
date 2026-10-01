import duckdb
import os
import re

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
    other_tags NOT LIKE '%"railway"%'
    AND other_tags NOT LIKE '%"public_transport"%'
    AND other_tags NOT LIKE '%"bus"%'
    AND other_tags NOT LIKE '%"barrier"%'
    AND other_tags NOT LIKE '%"highway"%'
    AND other_tags NOT LIKE '%"power"%'
  )
  AND (
    other_tags LIKE '%"industrial"%'
    OR other_tags LIKE '%"factory"%'
    OR other_tags LIKE '%"company"%'
    OR other_tags LIKE '%"contact:phone"%'
    OR other_tags LIKE '%"contact:email"%'
    OR other_tags LIKE '%"contact:website"%'
  )
LIMIT 20;
"""

rows = con.execute(query).fetchall()
print(f"Sample 20 Pure Commercial Records (No transport/infrastructure):")
for r in rows:
    osm_id, name, phone, website, other_tags, lon, lat = r
    print(f"[{osm_id}] {name} | Phone: {phone} | Web: {website} | Tags: {other_tags[:120]}... | Coord: ({lat:.4f}, {lon:.4f})")

count_query = f"""
SELECT count(*)
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
    other_tags NOT LIKE '%"railway"%'
    AND other_tags NOT LIKE '%"public_transport"%'
    AND other_tags NOT LIKE '%"bus"%'
    AND other_tags NOT LIKE '%"barrier"%'
    AND other_tags NOT LIKE '%"highway"%'
    AND other_tags NOT LIKE '%"power"%'
  )
  AND (
    other_tags LIKE '%"industrial"%'
    OR other_tags LIKE '%"factory"%'
    OR other_tags LIKE '%"company"%'
    OR other_tags LIKE '%"contact:phone"%'
    OR other_tags LIKE '%"contact:email"%'
    OR other_tags LIKE '%"contact:website"%'
  )
"""
total = con.execute(count_query).fetchone()[0]
print(f"\nTotal Clean Commercial Entities: {total:,}")
con.close()
