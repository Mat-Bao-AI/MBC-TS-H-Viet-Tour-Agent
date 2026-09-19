"""Optional Brave Search enrichment for URL-generated tour timelines."""

import logging

import httpx

from app.core import dynamic_config

logger = logging.getLogger(__name__)
_ENDPOINT = "https://api.search.brave.com/res/v1/web/search"
_IMAGE_ENDPOINT = "https://api.search.brave.com/res/v1/images/search"


async def _search(query: str, api_key: str | None = None) -> list[dict]:
    api_key = api_key or await dynamic_config.get_brave_search_api_key()
    if not api_key.strip():
        return []
    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.get(
            _ENDPOINT,
            # Brave's current country enum does not include VN; ALL keeps the
            # independent index global while search_lang still prefers Vietnamese.
            params={"q": query, "count": 5, "country": "ALL", "search_lang": "vi"},
            headers={"Accept": "application/json", "X-Subscription-Token": api_key},
        )
    response.raise_for_status()
    return response.json().get("web", {}).get("results", [])


async def get_travel_context(destinations: list[str]) -> str | None:
    if not destinations or not await dynamic_config.brave_search_configured():
        return None
    try:
        results = await _search(f"{' '.join(destinations[:3])} du lịch thông tin tham quan")
    except Exception as exc:  # Brave is optional; never fail tour generation
        logger.warning("Brave Search bổ sung nguồn thất bại: %s", exc)
        return None
    rows = [
        f"- {item.get('title', '')}: {item.get('description', '')} ({item.get('url', '')})"
        for item in results[:5]
    ]
    return "\n".join(rows) or None


async def find_travel_image_urls(query: str) -> list[str]:
    """Return candidate source image URLs; caller validates/downloads them."""
    api_key = await dynamic_config.get_brave_search_api_key()
    if not api_key.strip():
        return []
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get(
                _IMAGE_ENDPOINT,
                params={"q": query, "count": 10, "country": "ALL", "search_lang": "vi", "safesearch": "strict"},
                headers={"Accept": "application/json", "X-Subscription-Token": api_key},
            )
        response.raise_for_status()
        urls = []
        for item in response.json().get("results", []):
            url = (item.get("properties") or {}).get("url") or item.get("url")
            if url and url not in urls:
                urls.append(url)
        return urls
    except Exception as exc:  # optional enrichment must never fail tour generation
        logger.warning("Brave Image Search bổ sung ảnh thất bại: %s", exc)
        return []


async def test_brave_search_connection(api_key: str | None = None) -> tuple[bool, str]:
    if not api_key and not await dynamic_config.brave_search_configured():
        return False, "Chưa cấu hình Brave Search API key."
    try:
        await _search("Vietnam travel", api_key=api_key)
        return True, "Kết nối Brave Search thành công."
    except httpx.HTTPStatusError as exc:
        return False, f"Brave Search trả HTTP {exc.response.status_code}."
    except Exception as exc:
        return False, str(exc)
