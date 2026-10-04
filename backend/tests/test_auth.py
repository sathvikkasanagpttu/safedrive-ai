import pytest
from app.utils.security import hash_password, verify_password, create_access_token, decode_token, hash_token

def test_password_hashing():
    pwd = "EnterpriseSafeDrive!2026"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_generation_and_decoding():
    user_id = 42
    role = "safety_officer"
    token = create_access_token(user_id, role)
    assert token is not None

    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == str(user_id)
    assert payload["role"] == role
    assert payload["type"] == "access"

def test_invalid_token_decoding():
    bad_token = "invalid.token.structure"
    payload = decode_token(bad_token)
    assert payload is None

def test_token_hash():
    token = "sample_refresh_token_string"
    h1 = hash_token(token)
    h2 = hash_token(token)
    assert h1 == h2
    assert len(h1) == 64  # SHA-256 hex digest
