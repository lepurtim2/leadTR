import duckdb

con = duckdb.connect()
cols = [c[0] for c in con.execute("DESCRIBE SELECT * FROM 'data/parquets/sector_01_istanbul_marmara_dogu.parquet'").fetchall()]
print("Parquet columns:", cols)
print("'business_status' in cols:", 'business_status' in cols)
