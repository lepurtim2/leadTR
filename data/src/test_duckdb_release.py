import os
import duckdb

target_parquet = os.path.abspath("data/parquets/sector_01_istanbul_marmara_dogu.parquet")
print("Reading with isolated connection...")
con = duckdb.connect(':memory:')
con.execute("PRAGMA enable_object_cache=false;")
rows = con.execute(f"SELECT count(*) FROM '{target_parquet.replace(os.sep, '/')}'").fetchall()
print(f"Read {rows[0][0]:,} rows.")
con.close()
del con

# Test os.replace on target_parquet directly
import shutil
shutil.copyfile(target_parquet, target_parquet + ".bak")
try:
    os.replace(target_parquet + ".bak", target_parquet)
    print("Direct replace on sector_01 SUCCEEDED!")
except Exception as e:
    print(f"Direct replace on sector_01 FAILED: {e}")
