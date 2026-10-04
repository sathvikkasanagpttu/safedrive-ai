import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.utils.logger import setup_logging
from app.utils.seeder import seed_database

# Routers
from app.api.auth import router as auth_router
from app.api.drivers import router as drivers_router
from app.api.sessions import router as sessions_router
from app.api.events import router as events_router
from app.api.alerts import router as alerts_router
from app.api.analytics import router as analytics_router
from app.api.reports import router as reports_router
from app.api.audit import router as audit_router
from app.api.admin import router as admin_router
from app.api.copilot import router as copilot_router
from app.api.fleet import router as fleet_router
from app.api.privacy import router as privacy_router
from app.api.mlops import router as mlops_router
from app.api.evidence import router as evidence_router
from app.api.evaluation import router as evaluation_router
from app.ws.live_monitor import router as ws_router

logger = setup_logging()

def auto_migrate_sqlite(eng):
    """
    Safely migrates SQLite schema by adding any missing columns defined in SQLAlchemy models.
    Prevents OperationalError: no such column when models are expanded.
    """
    if eng.dialect.name != "sqlite":
        return
    import sqlalchemy as sa
    with eng.connect() as conn:
        for table_name, table in Base.metadata.tables.items():
            try:
                res = conn.execute(sa.text(f"PRAGMA table_info({table_name});"))
                existing_cols = {row[1] for row in res.fetchall()}
                for col in table.columns:
                    if col.name not in existing_cols:
                        col_type = col.type.compile(eng.dialect)
                        logger.info(f"Adding missing column '{col.name}' to table '{table_name}'")
                        conn.execute(sa.text(f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type}"))
                conn.commit()
            except Exception as ex:
                logger.warning(f"Auto-migration check for table {table_name}: {ex}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables created, migrated, and database seeded
    logger.info("Initializing SafeDrive AI database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        auto_migrate_sqlite(engine)
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Database initialization warning: {e}")

    logger.info("SafeDrive AI application startup complete.")
    yield
    # Shutdown
    logger.info("SafeDrive AI application shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SafeDrive AI 2.0 — Intelligent Driver Monitoring & Mobility Safety Platform API",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local development, Docker, and frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Timing & Correlation ID Middleware
@app.middleware("http")
async def add_process_time_and_request_id(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    t0 = time.time()
    try:
        response = await call_next(request)
        duration_ms = round((time.time() - t0) * 1000.0, 2)
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Process-Time-Ms"] = str(duration_ms)
        return response
    except Exception as exc:
        logger.error(f"Unhandled exception processing {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "An internal server error occurred. Please contact the safety system administrator.",
                "request_id": req_id
            }
        )

# Include API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(drivers_router, prefix=settings.API_V1_STR)
app.include_router(sessions_router, prefix=settings.API_V1_STR)
app.include_router(events_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(copilot_router) # /api/copilot
app.include_router(fleet_router)   # /api/fleet
app.include_router(privacy_router) # /api/privacy
app.include_router(mlops_router)   # /api/mlops
app.include_router(evidence_router) # /api/evidence
app.include_router(evaluation_router, prefix=settings.API_V1_STR) # /api/evaluation

# Include WebSocket Router
app.include_router(ws_router)

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "ai_engine": "ready",
        "timestamp": time.time()
    }

@app.get("/", tags=["Root"])
def root_info():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR,
        "websocket": "/ws/live-monitor"
    }
