"""
auth.py — JWT verification and FastAPI authentication dependencies.

Verifies Supabase JWTs locally using the project's JWT secret (HS256).
No network call to Supabase on every request — fast sub-millisecond verification.
"""

import os
import base64
import json
import hmac
import hashlib
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# FastAPI security scheme — extracts Bearer token from Authorization header
security = HTTPBearer(auto_error=False)


def _b64_decode(s: str) -> bytes:
    """Base64url decode with padding."""
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)


def verify_token(token: str) -> dict:
    """
    Decode and verify a Supabase JWT manually.
    This avoids all library conflicts between python-jose and PyJWT.
    """
    if not JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT secret not configured. Set SUPABASE_JWT_SECRET in .env",
        )

    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Token must have 3 parts")

        header_b64, payload_b64, signature_b64 = parts

        # Decode header to verify HS256
        header = json.loads(_b64_decode(header_b64))
        if header.get("alg") != "HS256":
            raise ValueError(f"Unsupported algorithm: {header.get('alg')}")

        # Verify signature
        message = f"{header_b64}.{payload_b64}".encode("utf-8")
        secret_bytes = JWT_SECRET.encode("utf-8")
        expected_sig = base64.urlsafe_b64encode(
            hmac.new(secret_bytes, message, hashlib.sha256).digest()
        ).rstrip(b"=")
        actual_sig = signature_b64.encode("utf-8")

        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("Invalid signature")

        # Decode payload
        payload = json.loads(_b64_decode(payload_b64))

        # Check expiration
        import time
        exp = payload.get("exp")
        if exp and time.time() > exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
            )

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
