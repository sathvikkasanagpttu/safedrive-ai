import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger("safedrive.database")

Base = declarative_base()

def get_engine():
    # Attempt connecting to primary PostgreSQL database; if unreachable in local dev mode, fallback
    try:
        connect_args = {"connect_timeout": 1} if "postgresql" in settings.DATABASE_URL else {}
        engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args=connect_args
        )
        # Test connection
        with engine.connect() as conn:
            pass
        logger.info(f"Connected to primary database: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else 'configured DB'}")
        return engine
    except Exception as e:
        if settings.USE_SQLITE_FALLBACK:
            logger.warning(f"Primary PostgreSQL unavailable ({e}). Falling back to SQLite: {settings.FALLBACK_SQLITE_URL}")
            return create_engine(
                settings.FALLBACK_SQLITE_URL,
                connect_args={"check_same_thread": False}
            )
        raise e

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
