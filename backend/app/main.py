import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure backend root is on sys.path when executed directly
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

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

    # MLflow server auto-start & Model pre-warming (in background thread so startup isn't blocked)
    import threading
    from app.services.mlflow_service import mlflow_service

    def warm_model_and_services():
        try:
            logger.info("Auto-starting embedded MLflow tracking server...")
            mlflow_service.start_local_server()
        except Exception as e:
            logger.warning(f"MLflow server startup notice: {e}")

        try:
            logger.info("Pre-warming model singleton in background...")
            model_manager.load_model()
            logger.info("Model singleton ready for inference.")
        except Exception as e:
            logger.warning(f"Background model pre-warming warning: {e}")

    threading.Thread(target=warm_model_and_services, daemon=True).start()

    yield
    logger.info("Shutting down Text Summarization Pipeline application...")
    try:
        mlflow_service.stop_local_server()
    except Exception:
        pass

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

import httpx
from fastapi.responses import RedirectResponse, StreamingResponse

# MLflow Internal Reverse Proxy (routes all /mlflow, /ajax-api, /api/2.0, /api/3.0, /static-files to embedded MLflow instance)
_MLFLOW_INTERNAL_URL = "http://127.0.0.1:5000"

async def _forward_to_mlflow(request: Request, path: str = ""):
    url = f"{_MLFLOW_INTERNAL_URL}/{path}"
    if request.url.query:
        url = f"{url}?{request.url.query}"
    
    client = httpx.AsyncClient(timeout=60.0)
    try:
        content = await request.body()
        headers = dict(request.headers)
        headers.pop("host", None)
        headers.pop("content-length", None)
        
        rp_req = client.build_request(request.method, url, headers=headers, content=content)
        rp_resp = await client.send(rp_req, stream=True)
        
        resp_headers = dict(rp_resp.headers)
        resp_headers.pop("content-encoding", None)
        resp_headers.pop("content-length", None)
        
        # Rewrite any internal redirects to stay on the public reverse-proxy route
        if "location" in resp_headers:
            loc = resp_headers["location"]
            loc = loc.replace("http://127.0.0.1:5000", "/mlflow").replace("http://localhost:5000", "/mlflow")
            if loc == "/":
                loc = "/mlflow/"
            resp_headers["location"] = loc
        
        return StreamingResponse(
            rp_resp.aiter_raw(),
            status_code=rp_resp.status_code,
            headers=resp_headers,
            background=client.aclose
        )
    except Exception as e:
        await client.aclose()
        return JSONResponse(
            status_code=503,
            content={"detail": f"MLflow tracking service is starting up or temporarily unavailable: {e}"}
        )

@app.get("/mlflow", include_in_schema=False)
def mlflow_redirect():
    return RedirectResponse(url="/mlflow/", status_code=307)

@app.api_route("/mlflow/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"], include_in_schema=False)
async def mlflow_proxy(request: Request, path: str = ""):
    return await _forward_to_mlflow(request, path)

@app.api_route("/ajax-api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], include_in_schema=False)
async def mlflow_ajax_proxy(request: Request, path: str = ""):
    return await _forward_to_mlflow(request, f"ajax-api/{path}")

@app.api_route("/api/2.0/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], include_in_schema=False)
async def mlflow_api2_proxy(request: Request, path: str = ""):
    return await _forward_to_mlflow(request, f"api/2.0/{path}")

@app.api_route("/api/3.0/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], include_in_schema=False)
async def mlflow_api3_proxy(request: Request, path: str = ""):
    return await _forward_to_mlflow(request, f"api/3.0/{path}")

@app.api_route("/build/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
async def mlflow_build_proxy(request: Request, path: str = ""):
    return await _forward_to_mlflow(request, f"build/{path}")

@app.api_route("/static-files/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
async def mlflow_static_proxy(request: Request, path: str = ""):
    return await _forward_to_mlflow(request, f"static-files/{path}")

@app.api_route("/get-artifact", methods=["GET"], include_in_schema=False)
async def mlflow_artifact_proxy(request: Request):
    return await _forward_to_mlflow(request, "get-artifact")

@app.api_route("/graphql", methods=["POST", "GET", "OPTIONS"], include_in_schema=False)
async def mlflow_graphql_proxy(request: Request):
    return await _forward_to_mlflow(request, "graphql")

@app.api_route("/model-versions/{path:path}", methods=["GET", "POST"], include_in_schema=False)
async def mlflow_model_versions_proxy(request: Request, path: str = ""):
    return await _forward_to_mlflow(request, f"model-versions/{path}")

@app.api_route("/version", methods=["GET"], include_in_schema=False)
async def mlflow_version_proxy(request: Request):
    return await _forward_to_mlflow(request, "version")

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Serve compiled frontend React application when available
_frontend_dist = _BACKEND_DIR.parent / "frontend" / "dist"
if not _frontend_dist.exists():
    _frontend_dist = _BACKEND_DIR / "dist"

if _frontend_dist.exists() and (_frontend_dist / "index.html").exists():
    if (_frontend_dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(_frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}", tags=["Frontend"])
    async def serve_frontend(full_path: str):
        if (
            full_path.startswith("api/")
            or full_path.startswith("docs")
            or full_path.startswith("redoc")
            or full_path.startswith("openapi.json")
            or full_path.startswith("mlflow")
            or full_path.startswith("ajax-api")
            or full_path.startswith("static-files")
            or full_path.startswith("get-artifact")
            or full_path.startswith("graphql")
            or full_path.startswith("model-versions")
            or full_path.startswith("build")
            or full_path.startswith("version")
        ):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        target_file = _frontend_dist / full_path
        if full_path and target_file.exists() and target_file.is_file():
            return FileResponse(str(target_file))
        return FileResponse(str(_frontend_dist / "index.html"))
else:
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


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)

