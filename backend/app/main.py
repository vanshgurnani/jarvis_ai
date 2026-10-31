from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.memory.sqlite import init_db
from app.api import health, chat, memory, approvals, voice, settings as settings_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    await init_db()
    yield
    # Shutdown

app = FastAPI(
    title="FRIDAY AI Desktop Companion Backend",
    version="0.1.0",
    lifespan=lifespan
)

# Allow requests from local Vite server and Tauri webview
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",
        "http://127.0.0.1:1420",
        "tauri://localhost",
        "http://localhost:5173",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(memory.router)
app.include_router(approvals.router)
app.include_router(voice.router)
app.include_router(settings_router.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

