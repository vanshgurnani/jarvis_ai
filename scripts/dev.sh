#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "🤖 Starting FRIDAY local environment..."

# 1. Check / initialize virtual environment (supports root .venv or backend/.venv)
if [ -d "$DIR/backend/.venv" ]; then
    source "$DIR/backend/.venv/bin/activate"
elif [ -d "$DIR/.venv" ]; then
    source "$DIR/.venv/bin/activate"
else
    echo "📦 Creating Python virtual environment in backend/.venv..."
    /opt/homebrew/bin/python3.11 -m venv "$DIR/backend/.venv" 2>/dev/null || python3 -m venv "$DIR/backend/.venv"
    source "$DIR/backend/.venv/bin/activate"
fi

# Ensure uvicorn, greenlet, and backend packages are installed
if ! command -v uvicorn >/dev/null 2>&1 || ! python -c "import greenlet" >/dev/null 2>&1; then
    echo "📦 Installing/verifying backend dependencies (including greenlet for SQLAlchemy)..."
    pip install -r "$DIR/backend/requirements.txt"
fi

# 2. Ensure frontend packages are installed
if [ ! -d "$DIR/frontend/node_modules" ] || [ ! -f "$DIR/frontend/node_modules/.bin/vite" ]; then
    echo "📦 Installing frontend dependencies (npm install)..."
    (cd "$DIR/frontend" && npm install)
fi

# 3. Ensure .env exists in backend
if [ ! -f "$DIR/backend/.env" ]; then
    echo "📄 Creating backend/.env from backend/.env.example..."
    cp "$DIR/backend/.env.example" "$DIR/backend/.env"
fi

# Function to kill all subprocesses on EXIT
cleanup() {
    echo ""
    echo "🛑 Shutting down FRIDAY services..."
    kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# 4. Start Backend
echo "🚀 Starting FastAPI backend on http://127.0.0.1:8765..."
cd "$DIR/backend"
uvicorn app.main:app --host 127.0.0.1 --port 8765 --reload &
BACKEND_PID=$!
cd "$DIR"

# Wait for backend health
echo "⏳ Waiting for backend to become healthy..."
for i in {1..20}; do
    if curl -s http://127.0.0.1:8765/health > /dev/null; then
        echo "✅ Backend is healthy at http://127.0.0.1:8765!"
        break
    fi
    sleep 0.5
done

# 5. Check if Tauri and Cargo are available
if command -v cargo >/dev/null 2>&1; then
    echo "🦀 Launching via Tauri Desktop Shell..."
    npm run tauri dev
else
    echo "🌐 Starting Vite web frontend directly at http://localhost:1420..."
    echo "💡 Note: To launch as a native macOS Tauri app, install Rust: 'brew install rust' or 'curl --proto =https --tlsv1.2 -sSf https://sh.rustup.rs | sh'"
    cd "$DIR/frontend"
    npm run dev
fi
