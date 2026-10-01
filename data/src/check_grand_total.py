import duckdb

con = duckdb.connect()
total = con.execute("SELECT count(*) FROM 'data/parquets/*.parquet'").fetchone()[0]
print(f"Total Clean Real Commercial Records in Lake: {total:,}")
