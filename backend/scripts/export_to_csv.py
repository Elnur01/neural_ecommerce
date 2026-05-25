import os
import csv
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DIRECT_URL") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL or DIRECT_URL not found in .env")
    exit(1)

# Setup connection engine
engine = create_engine(DATABASE_URL)

# Research tables to export
tables = [
    "users",
    "sessions",
    "events",
    "orders",
    "order_items",
    "reviews",
    "post_session_survey"
]

export_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "exports")
os.makedirs(export_dir, exist_ok=True)

print(f"Connecting to database and exporting tables to: {export_dir}")

with engine.connect() as conn:
    # 1. Fetch all users ordered by creation time to build a stable customer_id mapping
    print("Building customer ID mapping...")
    users_result = conn.execute(text("SELECT customer_id FROM users ORDER BY created_at ASC"))
    customer_map = {}
    for idx, row in enumerate(users_result):
        uuid_str = str(row[0])
        customer_map[uuid_str] = f"customer-{idx+1:03d}"
    print(f"Mapped {len(customer_map)} unique customers.")

    # 2. Export each table and translate customer_id column values
    for table in tables:
        try:
            print(f"Exporting table '{table}'...")
            result = conn.execute(text(f"SELECT * FROM {table}"))
            
            csv_path = os.path.join(export_dir, f"{table}.csv")
            with open(csv_path, mode='w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                
                # Write header
                headers = list(result.keys())
                writer.writerow(headers)
                
                # Write rows with mapped customer_id
                row_count = 0
                for row in result:
                    row_list = list(row)
                    for col_idx, col_name in enumerate(headers):
                        if col_name == "customer_id" and row_list[col_idx] is not None:
                            val = str(row_list[col_idx])
                            row_list[col_idx] = customer_map.get(val, val)
                    writer.writerow(row_list)
                    row_count += 1
                    
            print(f"✓ Table '{table}' exported successfully ({row_count} rows).")
        except Exception as e:
            print(f"✗ Failed to export table '{table}': {e}")

print("\nExport completed successfully!")
