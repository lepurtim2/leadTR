import duckdb
import os
import time

con = duckdb.connect()
con.execute("LOAD spatial;")
pbf_path = "data/turkey-latest.osm.pbf"

if os.path.exists(pbf_path):
    desc = con.execute(f"DESCRIBE SELECT * FROM ST_Read('{pbf_path.replace(os.sep, '/')}', layer='multipolygons') LIMIT 1").fetchall()
    cols = [d[0] for d in desc]
    print("Columns:", cols)

    t0 = time.time()
    query = f"""
    SELECT count(*) 
    FROM ST_Read('{pbf_path.replace(os.sep, "/")}', layer='multipolygons')
    WHERE name IS NOT NULL 
      AND (
        amenity IS NOT NULL 
        OR shop IS NOT NULL 
        OR office IS NOT NULL 
        OR leisure IS NOT NULL 
        OR tourism IS NOT NULL 
        OR craft IS NOT NULL
        OR building IS NOT NULL
      )
    """
    count = con.execute(query).fetchone()[0]
    print(f"Commercial Entities in OSM Multipolygons: {count:,} (took {time.time()-t0:.1f}s)")
con.close()
