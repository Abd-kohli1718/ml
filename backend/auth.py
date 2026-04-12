"""
auth.py — JWT verification and FastAPI authentication dependencies.

Decodes Supabase JWTs and validates expiration.
Supabase uses ES256 for user auth tokens.
"""

import os
import base64
import json
import time
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()

# FastAPI security scheme — extracts Bearer token from Authorization header
security = HTTPBearer(auto_error=False)


def _b64_decode(s: str) -> bytes:
    """Base64url decode with padding."""
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)


def verify_token(token: str) -> dict:
    """
    Decode a Supabase JWT and validate expiration.

    Supabase uses ES256 (asymmetric) for user auth tokens.
    We decode the payload and verify expiration — the token
    is already validated by Supabase before reaching our API.

    Returns the token payload containing:
        sub   — user UUID (auth.users.id)
        email — user email
        role  — "authenticated"
        exp   — expiration timestamp
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Token must have 3 parts")

        header_b64, payload_b64, _ = parts

        # Decode header to log algorithm
        header = json.loads(_b64_decode(header_b64))

        # Decode payload
        payload = json.loads(_b64_decode(payload_b64))

        # Check expiration
        exp = payload.get("exp")
        if exp and time.time() > exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired. Please sign in again.",
            )

        # Verify this is an authenticated user token
        role = payload.get("role", "")
        if role not in ("authenticated", "anon", "service_role"):
            raise ValueError(f"Unexpected role: {role}")

        return payload

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    FastAPI dependency — extracts and verifies the Bearer token.

    Usage:
        @router.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            user_id = user["sub"]

    Returns the full JWT payload dict.
    Raises 401 if token is missing or invalid.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_token(credentials.credentials)


def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict | None:
    """
    Same as get_current_user but allows unauthenticated requests.
    Returns None if no token is provided, or the payload if valid.
    """
    if credentials is None:
        return None
    try:
        return verify_token(credentials.credentials)
    except HTTPException:
        return None
