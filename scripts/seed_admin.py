#!/usr/bin/env python3
"""Create an admin account or reset an existing admin password.

Run from the repository root:

    python scripts/seed_admin.py --email admin@example.com

If --password is omitted, a cryptographically random password is generated
and printed once to stdout. The script intentionally resets the password on
every run, so do not run it automatically as part of application startup.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import secrets
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
if (SCRIPT_DIR / "../backend/app").exists():
    # Running from the repository checkout.
    PROJECT_ROOT = SCRIPT_DIR.parent
    BACKEND_DIR = PROJECT_ROOT / "backend"
elif (SCRIPT_DIR / "../app").exists():
    # Running inside the backend container, where /app contains the Python app.
    PROJECT_ROOT = SCRIPT_DIR.parent
    BACKEND_DIR = PROJECT_ROOT
else:
    raise RuntimeError("Could not locate the backend Python package.")
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(PROJECT_ROOT)

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed or reset the application admin account.")
    parser.add_argument(
        "--email",
        default=os.getenv("SEED_ADMIN_EMAIL", "").strip(),
        help="Admin email; defaults to SEED_ADMIN_EMAIL.",
    )
    parser.add_argument(
        "--password",
        default=os.getenv("SEED_ADMIN_PASSWORD", ""),
        help="Password to set; if omitted, generate a random password.",
    )
    parser.add_argument(
        "--full-name",
        default="Admin",
        help="Full name used only when creating a new account (default: Admin).",
    )
    return parser.parse_args()


def load_dotenv_defaults() -> None:
    """Load simple KEY=VALUE defaults without requiring python-dotenv.

    Explicit shell environment variables always win over values from .env.
    This keeps `./scripts/seed_admin.py` convenient while avoiding shell
    evaluation of the .env file.
    """
    env_path = PROJECT_ROOT / ".env"
    if not env_path.is_file():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        os.environ.setdefault(key, value)


async def seed_admin(email: str, password: str, full_name: str) -> str:
    from sqlalchemy import select

    from app.core.database import AsyncSessionLocal, engine
    from app.core.security import hash_password
    from app.models.user import User, UserRole

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()

            if user is None:
                user = User(
                    email=email,
                    password_hash=hash_password(password),
                    full_name=full_name,
                    role=UserRole.ADMIN,
                    is_active=True,
                )
                db.add(user)
                action = "created"
            else:
                user.password_hash = hash_password(password)
                user.role = UserRole.ADMIN
                user.is_active = True
                action = "reset"

            await db.commit()
            return action
    finally:
        await engine.dispose()


def main() -> None:
    load_dotenv_defaults()
    args = parse_args()
    email = args.email.strip().lower()
    password = args.password or secrets.token_urlsafe(18)

    if not email:
        raise SystemExit("Missing admin email. Use --email or set SEED_ADMIN_EMAIL.")
    if len(password) < 8:
        raise SystemExit("Password must contain at least 8 characters.")

    action = asyncio.run(seed_admin(email, password, args.full_name.strip() or "Admin"))
    print(f"Admin {action} successfully.")
    print(f"Email: {email}")
    print(f"Password: {password}")
    print("Store this password securely; it will not be shown again by the application.")


if __name__ == "__main__":
    main()
