# FRIDAY - macOS AI Companion

FRIDAY is a local macOS companion and assistant built with Tauri, React, and Python (FastAPI).

## Quick Start (Dev Mode)

### 1. Requirements
- Node.js >= 18 (`node -v`)
- Python 3.10+ (`python3 -v`)
- Rust & Cargo (optional for web preview, required for Tauri native desktop shell: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` or `brew install rust`)

### 2. First-Time Setup & Run
Run the automated dev launcher:
```bash
./scripts/dev.sh
```

Or step-by-step:
```bash
# 1. Setup Backend
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8765 --reload

# 2. Setup Frontend (in another terminal)
cd frontend
npm install
npm run dev

# 3. Or launch native Tauri desktop app (when Rust is installed)
npm install
npm run tauri dev
```

## Structure
- `backend/`: FastAPI backend, SQLite memory, tools registry, persona engine, voice TTS/STT.
- `frontend/`: React + Vite + Tailwind CSS desktop-optimized UI.
- `src-tauri/`: Rust Tauri shell managing desktop windows and backend sidecar lifecycle.
- `docs/`: Architecture, API contracts, security models, and roadmaps.

