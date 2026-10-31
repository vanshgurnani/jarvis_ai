# FRIDAY API Contract (127.0.0.1:8765)

All backend endpoints are bound strictly to `127.0.0.1`.

## Endpoints

### 1. Health
- `GET /health`
  - Response: `{"status": "healthy", "service": "FRIDAY AI Sidecar", "version": "0.1.0"}`

### 2. Chat Streaming (SSE)
- `POST /chat`
  - Request: `{"message": "string", "session_id": "default"}`
  - Response: Server-Sent Events stream:
    - `data: {"type": "content", "content": "..."}`
    - `data: {"type": "done", "content": ""}`
    - `data: {"type": "error", "content": "..."}`

### 3. Conversations & Memory
- `GET /conversations?session_id=default&limit=50`
  - Returns recent messages.
- `DELETE /conversations?session_id=default`
  - Clears chat history.
- `GET /memory`
  - Returns list of stored facts.
- `POST /memory`
  - Request: `{"fact": "...", "category": "preference"}`
- `DELETE /memory/{fact_id}`
  - Deletes a specific fact.

### 4. Approvals
- `POST /approvals/{id}`
  - Request: `{"decision": "approve" | "reject"}`

### 5. Voice
- `POST /voice/speak`
  - Request: `{"text": "..."}`
  - Returns: `audio/mpeg` (edge-tts) or `audio/aiff` (macOS say fallback).
- `POST /voice/transcribe`
  - Multipart form upload of audio file.
  - Returns: `{"text": "..."}`

