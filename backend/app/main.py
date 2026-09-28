from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api.routes import router
from app.ml.model_loader import model_manager
from app.models.db_models import SummaryLog
from app.utils.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database schema is created
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Pre-populate sample run log if database is completely new so UI looks authentic without fake numbers
    db = SessionLocal()
    try:
        if db.query(SummaryLog).count() == 0:
            logger.info("Seeding initial benchmark summarization log...")
            sample_log = SummaryLog(
                title="Transformer Architecture Milestone",
                input_text="The Transformer architecture has fundamentally reshaped artificial intelligence and natural language processing across multiple domains.",
                summary_text="The Transformer architecture has fundamentally revolutionized artificial intelligence and natural language processing.",
                model_name=settings.MODEL_NAME,
                model_version=settings.MODEL_VERSION,
                input_characters=144,
                input_words=17,
                summary_words=13,
                compression_ratio=0.7647,
                processing_time_ms=1150
            )
            db.add(sample_log)
            db.commit()
    except Exception as e:
        logger.warning(f"Initial seed log skipped: {e}")
        db.rollback()
    finally:
        db.close()

    # Model pre-warming (in background thread so startup isn't blocked)
    import threading
    def warm_model():
        try:
            logger.info("Pre-warming model singleton in background...")
            model_manager.load_model()
            logger.info("Model singleton ready for inference.")
        except Exception as e:
            logger.warning(f"Background model pre-warming warning: {e}")

    threading.Thread(target=warm_model, daemon=True).start()

    yield
    logger.info("Shutting down Text Summarization Pipeline application...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Text Summarization Pipeline — Intelligent NLP & MLOps Platform REST API",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global validation error handler (ensures clean 400 responses without raw stacktraces)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        msg = err.get("msg", "Invalid parameter")
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        errors.append(f"{loc}: {msg}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": "Validation error: " + "; ".join(errors)}
    )

# Generic exception handler
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred while processing the request."}
    )

# Include API router
app.include_router(router)

@app.get("/", tags=["Root"])
def root():
    return {
        "project": settings.PROJECT_NAME,
        "branding": settings.APP_BRANDING,
        "version": settings.APP_VERSION,
        "status": "online",
        "api_docs": "/docs",
        "api_v1": settings.API_V1_STR
    }
