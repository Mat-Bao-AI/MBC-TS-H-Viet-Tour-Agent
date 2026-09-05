"""Ghép parser_agent + timeline_agent thành 1 LangGraph state machine.

zalo_format_agent KHÔNG nằm trong graph này — nó chạy riêng ở bước dispatch
(sau khi HDV đã duyệt/sửa timeline), không phải lúc xử lý tài liệu ban đầu.
"""

from typing import TypedDict

from langgraph.graph import END, StateGraph

from app.agents import parser_agent, timeline_agent
from app.schemas.extraction import ExtractedTourInfo
from app.schemas.timeline import TimelineEventSchema


class DocumentProcessingState(TypedDict):
    itinerary_text: str
    guest_list_text: str | None
    extracted: ExtractedTourInfo | None
    events: list[TimelineEventSchema] | None


async def _parse_node(state: DocumentProcessingState) -> dict:
    extracted = await parser_agent.extract_tour_info(
        state["itinerary_text"], state.get("guest_list_text")
    )
    return {"extracted": extracted}


async def _timeline_node(state: DocumentProcessingState) -> dict:
    assert state["extracted"] is not None, "extracted phải có trước khi build timeline"
    # Truyền toàn văn tài liệu gốc (không chỉ bản tóm tắt extracted) — cần đủ
    # ngữ cảnh để trích agenda/thành phần/liên hệ chi tiết cho field
    # `program` của các mốc sự kiện chính (Phase 5, xem timeline.py).
    events = await timeline_agent.build_timeline(state["extracted"], state["itinerary_text"])
    return {"events": events}


def _build_graph():
    graph = StateGraph(DocumentProcessingState)
    graph.add_node("parse", _parse_node)
    graph.add_node("build_timeline", _timeline_node)
    graph.set_entry_point("parse")
    graph.add_edge("parse", "build_timeline")
    graph.add_edge("build_timeline", END)
    return graph.compile()


_document_processing_graph = _build_graph()


async def process_tour_documents(
    itinerary_text: str, guest_list_text: str | None = None
) -> DocumentProcessingState:
    """Entry point gọi từ app/api/v1/agent.py — chạy parse → build_timeline."""
    result = await _document_processing_graph.ainvoke(
        {
            "itinerary_text": itinerary_text,
            "guest_list_text": guest_list_text,
            "extracted": None,
            "events": None,
        }
    )
    return result
