# FRIDAY Architecture & System Design

```
npm run tauri dev (or bash scripts/dev.sh)
   │
   ├── Vite dev server (React + TS UI)         http://localhost:1420
   ├── Tauri shell (Rust): window, tray, hotkey, notifications
   └── Python backend (FastAPI sidecar)        http://127.0.0.1:8765
            ├── Agent loop + planner + policy engine
            ├── Persona + Hindi/English/Hinglish logic
            ├── SQLite memory (local file: `backend/friday.db`)
            ├── Mac tools: Calendar, Reminders, apps, files, notifications
            ├── Voice: edge-tts / macOS `say`, STT
            ├── Scheduler (APScheduler): briefings, reminders
            └── LLM provider ──HTTPS──► Cloudflare Worker → Render ai-model
```

## System Components

1. **Frontend (React + Vite + Tailwind CSS)**:
   - Compact desktop popover window (420x680) designed for menu bar / hotkey toggling (`Option+Space`).
   - Real-time Server-Sent Events (SSE) streaming chat.
   - Built-in Voice recording via `MediaRecorder` and playback.
   - Sensitive tool approval card renderer.
   - Long-term memory and facts management modal.

2. **Backend Sidecar (FastAPI + Python 3.11)**:
   - Spawns directly on `127.0.0.1:8765` when Tauri initializes.
   - Cleans up child processes upon Tauri window closure.
   - Persona engine configured via `persona.yaml` with multilingual & Hinglish support.
   - Policy engine safeguarding sensitive macOS tool calls.
   - SQLite database for persistent chat logs and approved user facts.

