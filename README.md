# Neural E-commerce Research Platform

This project is a fully-functional, simulated e-commerce platform designed to collect **demographic** and **sequential behavioral** data for academic research. It provides a realistic tech-gadget shopping experience with event-tracking, virtual wallets, and checkout simulations.

## Project Structure

- **`/frontend`**: Next.js 14 (App Router) + TailwindCSS. Contains all UI, the event-tracking SDK, and state management.
- **`/backend`**: FastAPI + SQLAlchemy. Handles authentication, database operations, and batched event ingestion.
- **`/research`**: Python data export pipeline (`export_data.py`) to extract clean datasets (CSV/Parquet) for Jupyter notebook analysis.
- **`/tests`**: Playwright E2E tests and `k6` load testing scripts.

---

## Local Development

### 1. Database Setup
1. Create a Supabase project.
2. In `backend/.env`, set your connection strings (from Supabase dashboard > Settings > Database):
   ```env
   DATABASE_URL="postgresql://postgres.xxx:YOUR_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
   DIRECT_URL="postgresql://postgres.xxx:YOUR_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
   SUPABASE_URL="https://xxx.supabase.co"
   SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

### 2. Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create tables
python -c "from app.database import engine, Base; from app.models.models import *; Base.metadata.create_all(engine)"

# Seed products and coupons
python -m seed.seed

# Start the API on port 8000
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install

# Create frontend/.env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Start the dev server on port 3001
npm run dev -- -p 3001
```

---

## 🚀 Deployment Guide (Phase 7)

### Step 1: Deploy Backend to Render (or Railway / Fly.io)
1. Commit and push your code to GitHub.
2. Go to [Render](https://render.com) and create a new **Web Service**.
3. Connect your GitHub repository.
4. Render will automatically detect the `render.yaml` or `Dockerfile` located in `/backend`.
5. In the Render Dashboard, set the following Environment Variables under the service settings:
   - `DATABASE_URL` (Your Supabase connection string)
   - `DIRECT_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SECRET_KEY` (Generate a secure random string)
   - `FRONTEND_URL` (Set to your Vercel URL once deployed, e.g., `https://neural-ecommerce.vercel.app`)
6. Deploy the service and copy the backend URL (e.g., `https://neural-backend.onrender.com`).

### Step 2: Deploy Frontend to Vercel
1. Go to [Vercel](https://vercel.com) and click **Add New Project**.
2. Import your GitHub repository.
3. Vercel will auto-detect Next.js. Set the **Root Directory** to `frontend`.
4. In the Environment Variables section, add:
   - `NEXT_PUBLIC_API_URL` (The backend URL from Render, e.g., `https://neural-backend.onrender.com`)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**.

### Step 3: Analytics / Sentry (Optional but recommended)
If you wish to track JS exceptions or 500 server errors during your research data collection:
1. Create a Sentry project.
2. Follow Next.js and FastAPI Sentry integration docs to inject the DSN into your environment variables on Render and Vercel.

---

## 🔬 Exporting Data for Research

Once the platform is live and participants are using it, you can export the data locally to your machine.

1. Ensure your `backend/.env` is configured correctly.
2. Run the export pipeline:
   ```bash
   source backend/.venv/bin/activate
   python research/export_data.py
   ```
3. Your datasets will be saved to `research/exports/`:
   - `demographic.csv` (1 row per participant, 11+ demographic fields)
   - `sequential.csv` / `sequential.parquet` (1 row per behavioral event, 19 fields)
