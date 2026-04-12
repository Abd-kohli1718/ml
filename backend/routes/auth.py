"""
auth.py — Authentication routes for Google OAuth via Supabase Auth.

POST /api/auth/google   — sign in with Google ID token
POST /api/auth/refresh  — refresh an expired access token
GET  /api/auth/me       — get current user profile
PUT  /api/auth/me       — update profile
POST /api/auth/logout   — sign out
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from backend.auth import get_current_user
from backend.db.supabase_client import get_supabase
from backend.db.users import get_profile, upsert_profile

router = APIRouter()


# --- Request Models ---

class GoogleSignInRequest(BaseModel):
    """Request body for Google sign-in."""
    id_token: str  # Google ID token from frontend


class RefreshTokenRequest(BaseModel):
    """Request body for token refresh."""
    refresh_token: str


class ProfileUpdateRequest(BaseModel):
    """Request body for profile update."""
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


# --- Routes ---

@router.post("/auth/google")
async def google_sign_in(body: GoogleSignInRequest):
    """
    Sign in with a Google ID token.

    The frontend obtains the Google ID token via Google Sign-In,
    then sends it here. Supabase Auth verifies it and returns
    a session with access_token + refresh_token.
    """
    supabase = get_supabase()
    try:
        response = supabase.auth.sign_in_with_id_token({
            "provider": "google",
            "token": body.id_token,
        })
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google sign-in failed: {e}")

    session = response.session
    user = response.user

    if not session or not user:
        raise HTTPException(status_code=401, detail="Authentication failed — no session returned")

    # Fetch or build profile info
    profile = get_profile(user.id)
    user_meta = user.user_metadata or {}

    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_in": session.expires_in,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": profile.get("full_name", "") if profile else user_meta.get("full_name", user_meta.get("name", "")),
            "avatar_url": profile.get("avatar_url", "") if profile else user_meta.get("avatar_url", user_meta.get("picture", "")),
        },
    }


@router.post("/auth/refresh")
async def refresh_token(body: RefreshTokenRequest):
    """Refresh an expired access token using a refresh token."""
    supabase = get_supabase()
    try:
        response = supabase.auth.refresh_session(body.refresh_token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token refresh failed: {e}")

    session = response.session
    if not session:
        raise HTTPException(status_code=401, detail="Refresh failed — no session returned")

    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_in": session.expires_in,
        "token_type": "bearer",
    }


@router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    user_id = user["sub"]
    profile = get_profile(user_id)

    if not profile:
        # Profile might not exist yet (race condition with trigger)
        return {
            "id": user_id,
            "email": user.get("email", ""),
            "full_name": "",
            "avatar_url": "",
            "created_at": None,
        }

    return profile


@router.put("/auth/me")
async def update_me(
    body: ProfileUpdateRequest,
    user: dict = Depends(get_current_user),
):
    """Update the current user's profile."""
    user_id = user["sub"]
    update_data = {}

    if body.full_name is not None:
        update_data["full_name"] = body.full_name
    if body.avatar_url is not None:
        update_data["avatar_url"] = body.avatar_url

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    profile = upsert_profile(user_id, update_data)
    return profile


@router.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    """Sign out the current user (invalidates server-side session)."""
    try:
        supabase = get_supabase()
        supabase.auth.sign_out()
    except Exception:
        pass  # Best-effort sign out
    return {"message": "Signed out successfully"}
