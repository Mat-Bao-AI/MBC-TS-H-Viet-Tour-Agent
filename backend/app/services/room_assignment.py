"""room_assignment.py — thuật toán tự động xếp phòng (Phase 4).

Đơn vị xếp phòng là 1 travel_group (khách không có nhóm = tự thành 1 nhóm 1
người) — cả nhóm PHẢI ở CHUNG 1 phòng, không tách lẻ từng người. Với mỗi
nhóm, chọn loại phòng có capacity VỪA ĐỦ NHỎ NHẤT (>= số người, ít lãng phí
chỗ trống nhất) trong số loại còn tồn kho, ưu tiên nhóm đông trước (giảm rủi
ro nhóm to bị kẹt vì phòng lớn đã hết khi tính tới lượt).

Hàm không tự commit DB (chỉ set attribute lên các object Guest đã truyền
vào) — dễ test, nơi gọi (app/api/v1/tours.py) chịu trách nhiệm đọc/commit
DB. Mỗi lần chạy TÍNH LẠI TOÀN BỘ và ghi đè room_type_id — an toàn vì đây
chỉ là gợi ý (khác guests.room_number, số phòng thật HDV tự điền, không bị
đụng tới)."""

from dataclasses import dataclass, field

from app.models.guest import Guest
from app.models.room_type import RoomType


@dataclass
class AssignedGroup:
    group_label: str  # travel_group, hoặc tên khách nếu đi 1 mình
    guest_ids: list[str]
    room_type: RoomType


@dataclass
class UnassignedGroup:
    group_label: str
    guest_ids: list[str]
    group_size: int
    reason: str


@dataclass
class RoomAssignmentResult:
    assigned: list[AssignedGroup] = field(default_factory=list)
    unassigned: list[UnassignedGroup] = field(default_factory=list)


def _group_guests(guests: list[Guest]) -> list[tuple[str, list[Guest]]]:
    """Gom khách theo travel_group — khách không có nhóm (None/rỗng) tự thành
    1 nhóm riêng (không gộp nhầm các khách lẻ khác nhau vào chung 1 phòng)."""
    groups: dict[str, list[Guest]] = {}
    order: list[str] = []
    for guest in guests:
        label = guest.travel_group.strip() if guest.travel_group and guest.travel_group.strip() else f"__solo__{guest.id}"
        if label not in groups:
            groups[label] = []
            order.append(label)
        groups[label].append(guest)

    return [(label if not label.startswith("__solo__") else groups[label][0].full_name, groups[label]) for label in order]


def assign_rooms(guests: list[Guest], room_types: list[RoomType]) -> RoomAssignmentResult:
    result = RoomAssignmentResult()

    # Reset trước — tính lại từ đầu mỗi lần chạy, không cộng dồn/kẹt gợi ý cũ
    # (vd sau khi HDV thêm/xoá loại phòng hoặc đổi travel_group của khách).
    for guest in guests:
        guest.room_type_id = None

    groups = _group_guests(guests)
    # Nhóm đông xử lý trước — nếu để nhóm nhỏ chiếm phòng lớn trước, nhóm to
    # đến lượt có thể không còn phòng phù hợp dù tổng sức chứa vẫn đủ.
    groups.sort(key=lambda g: len(g[1]), reverse=True)

    remaining_quantity = {rt.id: rt.quantity for rt in room_types}

    for group_label, group_guests in groups:
        group_size = len(group_guests)
        guest_ids = [g.id for g in group_guests]

        candidates = [
            rt for rt in room_types if rt.capacity >= group_size and remaining_quantity[rt.id] > 0
        ]
        if not candidates:
            max_capacity = max((rt.capacity for rt in room_types), default=0)
            if max_capacity < group_size:
                reason = f"Nhóm {group_size} người — chưa có loại phòng nào sức chứa đủ {group_size} người."
            else:
                reason = f"Nhóm {group_size} người — loại phòng phù hợp đã hết chỗ (hết tồn kho)."
            result.unassigned.append(
                UnassignedGroup(group_label=group_label, guest_ids=guest_ids, group_size=group_size, reason=reason)
            )
            continue

        best = min(candidates, key=lambda rt: rt.capacity)
        remaining_quantity[best.id] -= 1
        for guest in group_guests:
            guest.room_type_id = best.id
        result.assigned.append(AssignedGroup(group_label=group_label, guest_ids=guest_ids, room_type=best))

    return result
