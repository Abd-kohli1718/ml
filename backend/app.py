"""
app.py — FastAPI application factory.

Sets up:
    - CORS middleware (allows frontend at localhost:5173)
    - Lifespan event to verify Supabase connection on startup
    - Route registration for /api/*
    - Health-check endpoint at /api/health
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes.analyze import router as analyze_router
from backend.routes.history import router as history_router
from backend.routes.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle for the app."""
    # --- Startup ---
    print("\n[*] Voice Health API starting up...")

    # Verify Supabase connection
    try:
        from backend.db.supabase_client import get_supabase
        client = get_supabase()
        print("[OK] Supabase connected")
    except Exception as e:
        print(f"[WARN] Supabase connection failed: {e}")
        print("   The API will still work, but database features are disabled.")

    # Verify ML baseline exists
    try:
        import sys, os, importlib
        _src = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
        sys.path.insert(0, _src)
        try:
            baseline_mod = importlib.import_module("baseline")
            baseline_mod.load_baseline()
            print("[OK] ML baseline loaded")
        finally:
            if _src in sys.path:
                sys.path.remove(_src)
    except FileNotFoundError:
        print("[WARN] No ML baseline found. Run 'python main.py build' first.")
    except Exception as e:
        print(f"[WARN] Baseline check failed: {e}")

    print("[*] API is ready!\n")

    yield

    # --- Shutdown ---
    print("[*] Voice Health API shutting down.")


# --- Create the app ---
app = FastAPI(
    title="Voice Health API",
    description="Voice Biomarker Disease Tracking — Analyze vocal patterns for early health indicators.",
    version="1.0.0",
    lifespan=lifespan,
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # Next.js / CRA
        "http://localhost:8080",   # Generic dev
        "https://ml-t5te.vercel.app", # Vercel Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register routes ---
app.include_router(auth_router, prefix="/api", tags=["Auth"])
app.include_router(analyze_router, prefix="/api", tags=["Analysis"])
app.include_router(history_router, prefix="/api", tags=["History"])


# --- Health check ---
@app.get("/api/health", tags=["System"])
async def health_check():
    """Quick health check to verify the server is running."""
    return {
        "status": "ok",
        "service": "Voice Health API",
        "version": "1.0.0",
    }


@app.get("/api/debug/jwt", tags=["System"])
async def debug_jwt(token: str = None):
    """Temporary debug endpoint — check JWT library and config."""
    import jwt
    info = {
        "deploy_version": "v4-pyjwt-only",
        "jwt_secret_set": bool(os.getenv("SUPABASE_JWT_SECRET")),
        "jwt_secret_length": len(os.getenv("SUPABASE_JWT_SECRET", "")),
        "pyjwt_version": jwt.__version__,
    }

    if token:
        try:
            payload = jwt.decode(
                token,
                os.getenv("SUPABASE_JWT_SECRET", ""),
                algorithms=["HS256"],
                options={"verify_aud": False, "verify_iss": False},
            )
            info["decode_status"] = "success"
            info["sub"] = payload.get("sub", "?")
            info["exp"] = payload.get("exp", "?")
            info["role"] = payload.get("role", "?")
        except Exception as e:
            info["decode_status"] = "error"
            info["decode_error"] = f"{type(e).__name__}: {e}"

    return info


@app.get("/api/debug/db", tags=["System"])
async def debug_db():
    """Debug endpoint — test Supabase DB connection and key type."""
    info = {
        "supabase_url_set": bool(os.getenv("SUPABASE_URL")),
        "anon_key_set": bool(os.getenv("SUPABASE_ANON_KEY")),
        "service_role_key_set": bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY")),
        "key_being_used": "service_role" if os.getenv("SUPABASE_SERVICE_ROLE_KEY") else "anon",
    }

    try:
        from backend.db.supabase_client import get_supabase
        client = get_supabase()
        # Try a simple select
        result = client.table("voice_records").select("id").limit(1).execute()
        info["db_query"] = "success"
        info["record_count_sample"] = len(result.data) if result.data else 0
    except Exception as e:
        info["db_query"] = "error"
        info["db_error"] = str(e)

    return info
