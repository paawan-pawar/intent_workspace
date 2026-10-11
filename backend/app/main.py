from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine, Base
from app.api.health import router as health_router
from app.api.roles import router as roles_router
from app.api.dashboard import router as dashboard_router
from app.api.prompt import router as prompt_router
from app.api.actions import router as actions_router
from app.api.preferences import router as preferences_router
from app.api.calendar import router as calendar_router
from app.api.connections import router as connections_router
from app.api.meetings import router as meetings_router
from app.api.gmail import router as gmail_router
from app.api.sheets import router as sheets_router
from app.api.sheet_links import router as sheet_links_router
from app.api.shared_dashboard import router as shared_dashboard_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="Intent Workspace API",
    description="Backend API for the Intent Workspace prototype.",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS for the frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router, prefix="/api")
app.include_router(roles_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(prompt_router, prefix="/api")
app.include_router(actions_router, prefix="/api/actions")
app.include_router(preferences_router, prefix="/api")
app.include_router(calendar_router, prefix="/api")
app.include_router(connections_router, prefix="/api")
app.include_router(meetings_router, prefix="/api")
app.include_router(gmail_router, prefix="/api")
app.include_router(sheets_router, prefix="/api")
app.include_router(sheet_links_router, prefix="/api")
app.include_router(shared_dashboard_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to Intent Workspace API"}