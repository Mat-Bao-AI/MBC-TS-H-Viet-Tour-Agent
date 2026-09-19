"""Safely retrieve public HTML/PDF content supplied as a tour source URL."""

import asyncio
import ipaddress
import re
import socket
from dataclasses import dataclass
from html import unescape
from io import BytesIO
from urllib.parse import urljoin, urlsplit

import httpx
from pypdf import PdfReader

MAX_BYTES = 5 * 1024 * 1024
MAX_TEXT_CHARS = 60_000
MAX_REDIRECTS = 3
_USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"
_DEFAULT_HEADERS = {
    "User-Agent": _USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8",
    "Referer": "https://www.google.com/",
}


class WebSourceError(ValueError):
    """Safe, user-facing error for an unreadable or unsafe web source."""


@dataclass(frozen=True)
class WebSource:
    url: str
    title: str | None
    text: str
    image_url: str | None = None


async def _assert_public_host(hostname: str) -> None:
    if hostname.lower() in {"localhost", "localhost.localdomain"}:
        raise WebSourceError("Không nhận URL nội bộ hoặc localhost.")
    try:
        addresses = await asyncio.to_thread(socket.getaddrinfo, hostname, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise WebSourceError("Không tìm thấy máy chủ của URL này.") from exc

    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if not ip.is_global:
            raise WebSourceError("Không nhận URL trỏ tới địa chỉ nội bộ.")


def _validate_url(value: str) -> str:
    url = value.strip()
    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise WebSourceError("URL phải là một địa chỉ http/https công khai hợp lệ.")
    return url


async def _read_response(response: httpx.Response) -> bytes:
    content_length = response.headers.get("content-length")
    if content_length and int(content_length) > MAX_BYTES:
        raise WebSourceError("Nội dung URL vượt quá giới hạn 5 MB.")
    body = bytearray()
    async for chunk in response.aiter_bytes():
        body.extend(chunk)
        if len(body) > MAX_BYTES:
            raise WebSourceError("Nội dung URL vượt quá giới hạn 5 MB.")
    return bytes(body)


def _html_to_text(body: bytes) -> tuple[str | None, str, str | None]:
    html = body.decode("utf-8", errors="ignore")
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
    title = unescape(re.sub(r"\s+", " ", title_match.group(1)).strip())[:500] if title_match else None
    image_match = re.search(
        r'<meta[^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\'][^>]+content=["\']([^"\']+)',
        html,
        flags=re.IGNORECASE,
    )
    image_url = image_match.group(1).strip() if image_match else None
    cleaned = re.sub(r"<(script|style|noscript)[^>]*>.*?</\1>", " ", html, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    return title, unescape(re.sub(r"\s+", " ", cleaned)).strip()[:MAX_TEXT_CHARS], image_url


def _pdf_to_text(body: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(body))
        return "\n".join(page.extract_text() or "" for page in reader.pages).strip()[:MAX_TEXT_CHARS]
    except Exception as exc:  # malformed PDFs are untrusted remote input
        raise WebSourceError("Không đọc được nội dung text trong file PDF từ URL.") from exc


async def fetch_public_web_source(value: str) -> WebSource:
    """Fetch HTML/PDF with SSRF protections and bounded redirects/content."""
    current_url = _validate_url(value)
    timeout = httpx.Timeout(12.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False, headers=_DEFAULT_HEADERS) as client:
        for _ in range(MAX_REDIRECTS + 1):
            parsed = urlsplit(current_url)
            await _assert_public_host(parsed.hostname or "")
            try:
                async with client.stream("GET", current_url) as response:
                    if response.is_redirect:
                        location = response.headers.get("location")
                        if not location:
                            raise WebSourceError("URL chuyển hướng không hợp lệ.")
                        current_url = urljoin(current_url, location)
                        continue
                    if response.status_code >= 400:
                        raise WebSourceError("URL không hợp lệ hoặc không tải được thông tin, vui lòng nhập link khác.")
                    body = await _read_response(response)
                    content_type = response.headers.get("content-type", "").lower()
            except httpx.HTTPError as exc:
                raise WebSourceError("Không thể kết nối tới URL này.") from exc

            if "pdf" in content_type or body.startswith(b"%PDF"):
                text = _pdf_to_text(body)
                title = parsed.path.rsplit("/", 1)[-1] or "Tài liệu PDF"
                image_url = None
            elif "html" in content_type or body.lstrip().startswith(b"<"):
                title, text, image_url = _html_to_text(body)
                image_url = urljoin(current_url, image_url) if image_url else None
            else:
                raise WebSourceError("URL cần là trang web HTML hoặc file PDF công khai.")

            if len(text) < 200:
                raise WebSourceError("Nội dung URL quá ít hoặc không có text để lập lịch trình.")
            return WebSource(url=current_url, title=title, text=text, image_url=image_url)

    raise WebSourceError("URL chuyển hướng quá nhiều lần.")


async def download_public_image(image_url: str) -> tuple[bytes, str] | None:
    """Download a bounded public image, returning bytes and a safe extension."""
    try:
        image_url = _validate_url(image_url)
        parsed = urlsplit(image_url)
        await _assert_public_host(parsed.hostname or "")
        async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=5.0), headers=_DEFAULT_HEADERS) as client:
            async with client.stream("GET", image_url, follow_redirects=False) as response:
                if response.status_code >= 400:
                    return None
                content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
                if content_type not in {"image/jpeg", "image/png", "image/webp"}:
                    return None
                body = await _read_response(response)
        extension = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[content_type]
        return body, extension
    except (WebSourceError, httpx.HTTPError, ValueError):
        return None
