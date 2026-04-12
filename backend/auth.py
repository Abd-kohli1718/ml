"""
auth.py — JWT verification and FastAPI authentication dependencies.

Verifies Supabase JWTs locally using the project's JWT secret (HS256).
No network call to Supabase on every request — fast sub-millisecond verification.
"""

import os
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
JWT_ALGORITHM = "HS256"
JWT_AUDIENCE = "authenticated"

# FastAPI security scheme — extracts Bearer token from Authorization header
security = HTTPBearer(auto_error=False)


# Try python-jose first (installed by supabase), fall back to PyJWT
try:
    from jose import jwt as jose_jwt
    from jose.exceptions import ExpiredSignatureError as JoseExpiredError
    from jose.exceptions import JWTError as JoseJWTError

    def _decode_token(token: str) -> dict:
        return jose_jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"verify_aud": False},
        )

    _ExpiredError = JoseExpiredError
    _InvalidError = JoseJWTError

except ImportError:
    import jwt as pyjwt

    def _decode_token(token: str) -> dict:
        return pyjwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"verify_aud": False},
        )

    _ExpiredError = pyjwt.ExpiredSignatureError
    _InvalidError = pyjwt.InvalidTokenError


def verify_token(token: str) -> dict:
    """
    Decode and verify a Supabase JWT.

    Returns the token payload containing:
        sub   — user UUID (auth.users.id)
        email — user email
        role  — "authenticated"
        exp   — expiration timestamp
    """
    if not JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT secret not configured. Set SUPABASE_JWT_SECRET in .env",
        )

    try:
        payload = _decode_token(token)
        return payload
    except _ExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
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
