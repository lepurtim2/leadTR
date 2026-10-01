import duckdb
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

con = duckdb.connect()
con.execute("LOAD spatial;")
print("Checking OSM multipolygons layer for commercial establishments...")
t0 = time.time()
query = """
SELECT count(*) 
FROM ST_Read('data/turkey-latest.osm.pbf', layer='multipolygons') 
WHERE name IS NOT NULL 
  AND (
    amenity IS NOT NULL 
    OR shop IS NOT NULL 
    OR office IS NOT NULL 
    OR tourism IS NOT NULL 
    OR craft IS NOT NULL 
    OR building IN ('retail', 'commercial', 'supermarket', 'hotel', 'hospital', 'industrial')
  )
"""
count = con.execute(query).fetchone()[0]
elapsed = time.time() - t0
print(f"✅ Found {count:,} commercial businesses mapped as polygons/buildings in {elapsed:.1f}s!")
