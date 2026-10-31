#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "🤖 Starting FRIDAY local environment..."

# Check / initialize backend venv
if [ ! -d "backend/.venv" ]; then
    echo "📦 Creating Python virtual environment in backend/.venv..."
    /opt/homebrew/bin/python3.11 -m venv backend/.venv || python3 -m venv backend/.venv
    source backend/.venv/bin/activate
    pip install --upgrade pip
    pip install -e "backend[dev]"
else
    source backend/.venv/bin/activate
fi

# Ensure .env exists in backend
if [ ! -f "backend/.env" ]; then
    echo "📄 Creating backend/.env from backend/.env.example..."
    cp backend/.env.example backend/.env
fi

# Function to kill all subprocesses on EXIT
cleanup() {
    echo "🛑 Shutting down FRIDAY services..."
    kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Start Backend
echo "🚀 Starting FastAPI backend on http://127.0.0.1:8765..."
cd "$DIR/backend"
uvicorn app.main:app --host 127.0.0.1 --port 8765 --reload &
BACKEND_PID=$!
cd "$DIR"

# Wait for backend health
echo "⏳ Waiting for backend to become healthy..."
for i in {1..20}; do
    if curl -s http://127.0.0.1:8765/health > /dev/null; then
        echo "✅ Backend is healthy!"
        break
    fi
    sleep 0.5
done

# Check if Tauri and Cargo are available
if command -v cargo >/dev/null 2>&1; then
    echo "🦀 Launching via Tauri Desktop Shell..."
    npm run tauri dev
else
    echo "🌐 Cargo/Rust not detected in PATH. Starting Vite web frontend directly at http://localhost:1420..."
    echo "💡 Note: To launch as a native macOS Tauri app, install Rust: 'curl --proto =https --tlsv1.2 -sSf https://sh.rustup.rs | sh' or 'brew install rust'"
    cd "$DIR/frontend"
    npm run dev
fi

