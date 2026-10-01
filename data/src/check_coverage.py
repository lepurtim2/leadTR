import duckdb

con = duckdb.connect()
total = con.execute("SELECT count(*) FROM 'data/parquets/*.parquet'").fetchone()[0]
total_webs = con.execute("SELECT count(*) FROM 'data/parquets/*.parquet' WHERE website IS NOT NULL AND length(trim(website)) > 4").fetchone()[0]
total_phones = con.execute("SELECT count(*) FROM 'data/parquets/*.parquet' WHERE phone IS NOT NULL AND length(trim(phone)) > 6").fetchone()[0]
total_emails = con.execute("SELECT count(*) FROM 'data/parquets/*.parquet' WHERE email IS NOT NULL AND length(trim(email)) > 4").fetchone()[0]

print(f"Total Businesses: {total:,}")
print(f"Total with Website: {total_webs:,} ({(total_webs/total)*100:.1f}%)")
print(f"Total with Phone: {total_phones:,} ({(total_phones/total)*100:.1f}%)")
print(f"Total with Email: {total_emails:,} ({(total_emails/total)*100:.2f}%)")
con.close()
