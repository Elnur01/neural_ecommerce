# Neural E-commerce — Research Data Collection Platform

A tech-gadget e-commerce simulation designed to capture **demographic** and **sequential behavioral** data for academic research. Every user interaction produces clean, joinable datasets for analysis.

## 🏗️ Architecture

```
frontend/     → Next.js 14 (App Router) + TypeScript + TailwindCSS
backend/      → FastAPI (Python) + SQLAlchemy + PostgreSQL
research/     → Jupyter notebooks + export scripts
docs/         → Consent forms, privacy policy, data dictionary
```

## 🚀 Quick Start

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your values
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local  # fill in your values
npm run dev
```

## 📊 Research Data

- **Demographic dataset:** 11+ fields per user (age_group, city_tier, loyalty_tier, etc.)
- **Sequential dataset:** 19+ fields per event (scroll_depth, exit_intent, cart_state, etc.)
- **Export format:** CSV / Parquet via Jupyter notebooks

## 📝 License

For academic research purposes only.
