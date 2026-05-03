import os
import sys
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv

# Ensure we're in the right directory or path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")

# Load environment variables from the backend directory
env_path = os.path.join(BACKEND_DIR, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    print(f"❌ Could not find .env file at {env_path}")
    sys.exit(1)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL is not set in the environment.")
    sys.exit(1)

# Ensure exports directory exists
EXPORTS_DIR = os.path.join(SCRIPT_DIR, "exports")
os.makedirs(EXPORTS_DIR, exist_ok=True)

def export_data():
    print(f"🔌 Connecting to database...")
    engine = create_engine(DATABASE_URL)

    try:
        # Export Users (Demographic Data)
        print("📥 Exporting users table...")
        df_users = pd.read_sql_table("users", con=engine)
        users_csv_path = os.path.join(EXPORTS_DIR, "demographic.csv")
        df_users.to_csv(users_csv_path, index=False)
        print(f"✅ Saved {len(df_users)} users to {users_csv_path}")

        # Export Events (Sequential Behavioral Data)
        print("📥 Exporting events table...")
        df_events = pd.read_sql_table("events", con=engine)
        events_csv_path = os.path.join(EXPORTS_DIR, "sequential.csv")
        events_parquet_path = os.path.join(EXPORTS_DIR, "sequential.parquet")
        
        df_events.to_csv(events_csv_path, index=False)
        df_events.to_parquet(events_parquet_path, index=False)
        print(f"✅ Saved {len(df_events)} events to {events_csv_path} and .parquet")

        # Basic Validation Checks
        print("\n🔬 Running Basic Validation...")
        validate_schema(df_users, df_events)

    except Exception as e:
        print(f"❌ Export failed: {e}")

def validate_schema(df_users, df_events):
    # Check for expected columns in users
    expected_user_cols = {
        "customer_id", "email", "age_group", "gender", "city_tier", 
        "account_age_days", "lifetime_order_count", "total_order_value",
        "avg_order_value", "loyalty_tier", "preferred_device", "payment_method_saved"
    }
    missing_user_cols = expected_user_cols - set(df_users.columns)
    if missing_user_cols:
        print(f"⚠️ Warning: Missing expected user columns: {missing_user_cols}")
    else:
        print("✅ Demographic schema validation passed.")

    # Check for expected columns in events
    expected_event_cols = {
        "event_id", "session_id", "customer_id", "event_timestamp", "event_type",
        "page_url", "time_on_page_sec"
    }
    missing_event_cols = expected_event_cols - set(df_events.columns)
    if missing_event_cols:
        print(f"⚠️ Warning: Missing expected event columns: {missing_event_cols}")
    else:
        print("✅ Sequential event schema validation passed.")

    # Check for nulls in critical sequential fields
    if "event_type" in df_events.columns:
        null_types = df_events["event_type"].isnull().sum()
        if null_types > 0:
            print(f"⚠️ Warning: Found {null_types} events with null event_type.")

if __name__ == "__main__":
    print("🚀 Starting Data Export Pipeline...")
    export_data()
    print("🎉 Export complete.")
