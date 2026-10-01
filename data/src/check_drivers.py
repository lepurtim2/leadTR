import duckdb

con = duckdb.connect()
con.execute("LOAD spatial;")
drivers = con.execute("SELECT short_name, long_name FROM st_drivers() WHERE short_name ILIKE '%osm%'").fetchall()
print("OSM Drivers in DuckDB Spatial:", drivers)
