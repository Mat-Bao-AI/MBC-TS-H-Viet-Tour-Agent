"""crypto.py — mã hoá tại chỗ (encrypt-at-rest) cho config nhạy cảm lưu DB
(AI provider key — xem app/core/dynamic_config.py) bằng Fernet (AES-128-CBC +
HMAC, chuẩn thư viện `cryptography`).

Giới hạn THẬT cần hiểu rõ, không tô hồng: khoá mã hoá (CONFIG_ENCRYPTION_KEY)
vẫn phải nằm ở đâu đó ngoài DB để giải mã được — không có thiết kế nào tránh
được chicken-and-egg này. Ai có CẢ khoá lẫn quyền truy cập server đang chạy
app vẫn đọc được. Cái mã hoá này chặn được là: DB bị lộ RIÊNG (backup rò rỉ,
dump DB, SQL injection chỉ đọc được DB) mà KHÔNG kèm quyền truy cập server."""

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


class CryptoNotConfiguredError(RuntimeError):
    """CONFIG_ENCRYPTION_KEY chưa được set trong .env."""


@lru_cache
def _fernet() -> Fernet:
    key = get_settings().config_encryption_key.strip()
    if not key:
        raise CryptoNotConfiguredError(
            "CONFIG_ENCRYPTION_KEY chưa cấu hình trong .env — cần trước khi lưu "
            "bất kỳ config nào qua UI Admin. Generate: python -c "
            "\"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(key.encode())


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt(ciphertext: str) -> str:
    try:
        return _fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError(
            "Không giải mã được config đã lưu — CONFIG_ENCRYPTION_KEY có thể đã đổi "
            "so với lúc lưu. Cần nhập lại config qua UI Admin."
        ) from exc
