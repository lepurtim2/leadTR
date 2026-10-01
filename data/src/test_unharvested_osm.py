import duckdb
import os
import time

con = duckdb.connect()
con.execute("LOAD spatial;")
pbf_path = "data/turkey-latest.osm.pbf"

query = f"""
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
"""

print("Scanning for unharvested commercial points with contact/brand/industrial tags...")
t0 = time.time()
res = con.execute(query).fetchone()[0]
print(f"Unharvested Commercial Points in PBF: {res:,} (in {time.time()-t0:.1f}s)")
con.close()
