"""Schema response cho POST /tours/{id}/auto-assign-rooms (app/api/v1/tours.py)."""

from pydantic import BaseModel


class AssignedGroupOut(BaseModel):
    group_label: str
    guest_ids: list[str]
    room_type_id: str
    room_type_name: str


class UnassignedGroupOut(BaseModel):
    group_label: str
    guest_ids: list[str]
    group_size: int
    reason: str


class AutoAssignRoomsResponse(BaseModel):
    assigned: list[AssignedGroupOut]
    unassigned: list[UnassignedGroupOut]
