"""agent.py — endpoint kích hoạt agent xử lý tài liệu tour (parse + timeline).

process_tour() là hàm thật, tự mở session DB riêng (không nhận session từ
request) vì được gọi từ BackgroundTasks — chạy sau khi response đã trả về,
lúc đó request-scoped session trong tours.py đã đóng.
"""

import logging
from datetime import date

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models.guest import Guest
from app.models.timeline_event import Timeline
from app.models.tour import Tour, TourStatus, TourType
from app.schemas.tour import TourDetail
from app.services import file_processor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["agent"])


async def process_tour(tour_id: str) -> None:
    from app.agents import process_tour_documents  # tránh import vòng lúc module load

    async with AsyncSessionLocal() as db:
        tour = await db.get(Tour, tour_id, options=[selectinload(Tour.source_files)])
        if tour is None:
            logger.error("process_tour: không tìm thấy tour %s", tour_id)
            return

        tour.status = TourStatus.PARSING
        tour.process_error = None
        await db.commit()

        try:
            source_files = sorted(tour.source_files, key=lambda f: f.order_index)
            itinerary_text = "\n\n".join(
                f"--- Tài liệu: {f.filename} ---\n{file_processor.extract_text(f.path)}" for f in source_files
            )
            guest_list_text = (
                file_processor.extract_text(tour.guest_list_path) if tour.guest_list_path else None
            )

            result = await process_tour_documents(itinerary_text, guest_list_text)
            extracted = result["extracted"]
            events = result["events"]

            if extracted.tour_name:
                tour.name = extracted.tour_name
            tour.tour_type = TourType(extracted.tour_type)
            tour.summary = extracted.summary
            if extracted.start_date:
                try:
                    tour.start_date = date.fromisoformat(extracted.start_date)
                except ValueError:
                    pass
            if extracted.end_date:
                try:
                    tour.end_date = date.fromisoformat(extracted.end_date)
                except ValueError:
                    pass

            events_json = [e.model_dump() for e in events]
            existing_timeline = await db.execute(select(Timeline).where(Timeline.tour_id == tour.id))
            timeline = existing_timeline.scalar_one_or_none()
            if timeline is None:
                db.add(Timeline(tour_id=tour.id, events=events_json))
            else:
                timeline.events = events_json

            from app.api.v1.tours import upsert_guests_from_extraction  # tránh vòng import lúc module load

            existing_guests_result = await db.execute(select(Guest).where(Guest.tour_id == tour.id))
            existing_guests = {g.phone_number: g for g in existing_guests_result.scalars().all() if g.phone_number}
            upsert_guests_from_extraction(db, tour.id, extracted.guests, existing_guests)

            tour.status = TourStatus.REVIEW
            await db.commit()

        except Exception as exc:  # noqa: BLE001 — cố tình bắt rộng để luôn ghi lại lỗi cho HDV thấy
            logger.exception("process_tour lỗi cho tour %s", tour_id)
            tour.status = TourStatus.FAILED
            tour.process_error = str(exc)[:1000]
            await db.commit()


@router.post("/tours/{tour_id}/process", response_model=TourDetail)
async def trigger_process(tour_id: str) -> TourDetail:
    """Trigger thủ công (đồng bộ, chờ kết quả) — hữu ích khi test hoặc khi
    HDV muốn biết ngay kết quả thay vì đợi background task."""
    from app.api.v1.tours import get_tour

    async with AsyncSessionLocal() as db:
        tour = await db.get(Tour, tour_id)
        if tour is None:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy tour {tour_id}")

    await process_tour(tour_id)

    async with AsyncSessionLocal() as db:
        return await get_tour(tour_id, db)
