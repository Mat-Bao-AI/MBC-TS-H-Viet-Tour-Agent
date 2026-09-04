"""company.py — thương hiệu công ty du lịch (tên + logo), dùng chung toàn
workspace (không gắn theo tour/user). Mount TRỰC TIẾP ở app/main.py, KHÔNG
qua api_router — GET phải public (cần hiện logo ở /signin, TRƯỚC khi đăng
nhập, và ở /t/[id] cho khách xem). PUT/DELETE tự thêm Depends(require_admin)
riêng từng route.

Tên lưu qua app_settings (AppSetting, giống llm_primary_provider — không có
gì bí mật nhưng dùng lại đúng cơ chế đã có, đỡ thêm bảng mới). Logo lưu file
trên disk cùng thư mục upload_dir, đường dẫn cũng lưu qua app_settings."""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.core import dynamic_config
from app.core.config import get_settings
from app.core.security import require_admin
from app.schemas.company import CompanyInfo, CompanyInfoUpdateRequest

router = APIRouter(prefix="/company", tags=["company"])

_DEFAULT_NAME = "VietTour Agent"
_NAME_KEY = "company_name"
_LOGO_PATH_KEY = "company_logo_path"
_ALLOWED_LOGO_TYPES = {"image/jpeg", "image/png", "image/webp", "image/svg+xml"}
_CHUNK_SIZE = 1024 * 1024  # 1MB


@router.get("/info", response_model=CompanyInfo)
async def get_company_info() -> CompanyInfo:
    name = await dynamic_config.get_app_setting(_NAME_KEY) or _DEFAULT_NAME
    logo_path = await dynamic_config.get_app_setting(_LOGO_PATH_KEY)
    return CompanyInfo(name=name, logo_url="/api/v1/company/logo" if logo_path else None)


@router.get("/logo")
async def get_company_logo() -> FileResponse:
    logo_path = await dynamic_config.get_app_setting(_LOGO_PATH_KEY)
    if not logo_path or not Path(logo_path).exists():
        raise HTTPException(status_code=404, detail="Chưa có logo công ty.")
    return FileResponse(logo_path)


@router.put("/info", status_code=204, dependencies=[Depends(require_admin)])
async def set_company_info(payload: CompanyInfoUpdateRequest) -> None:
    await dynamic_config.set_app_setting(_NAME_KEY, payload.name.strip())


@router.put("/logo", status_code=204, dependencies=[Depends(require_admin)])
async def set_company_logo(file: UploadFile) -> None:
    if file.content_type not in _ALLOWED_LOGO_TYPES:
        raise HTTPException(status_code=400, detail="Chỉ nhận ảnh JPEG/PNG/WebP/SVG.")

    settings = get_settings()
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "").suffix
    saved_path = upload_dir / f"company_logo_{uuid.uuid4().hex[:8]}{ext}"

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    total = 0
    try:
        with saved_path.open("wb") as out:
            while chunk := file.file.read(_CHUNK_SIZE):
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(
                        status_code=413, detail=f"File vượt quá giới hạn {settings.max_upload_size_mb}MB."
                    )
                out.write(chunk)
    except HTTPException:
        saved_path.unlink(missing_ok=True)
        raise

    old_path = await dynamic_config.get_app_setting(_LOGO_PATH_KEY)
    await dynamic_config.set_app_setting(_LOGO_PATH_KEY, str(saved_path))
    if old_path:
        Path(old_path).unlink(missing_ok=True)


@router.delete("/logo", status_code=204, dependencies=[Depends(require_admin)])
async def clear_company_logo() -> None:
    old_path = await dynamic_config.get_app_setting(_LOGO_PATH_KEY)
    await dynamic_config.set_app_setting(_LOGO_PATH_KEY, None)
    if old_path:
        Path(old_path).unlink(missing_ok=True)
