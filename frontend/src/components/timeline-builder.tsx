"use client";

import { TimelineEvent } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * timeline-builder — HDV xem/sửa timeline trước khi gửi Zalo.
 *
 * Phase 1: sắp xếp lại bằng nút lên/xuống (không phải kéo-thả chuột thật) —
 * đơn giản hơn để giao đúng scope MVP, nâng cấp sang drag-and-drop ở Phase 2.
 */

type Props = {
  events: TimelineEvent[];
  onChange: (events: TimelineEvent[]) => void;
};

function emptyEvent(dayIndex: number): TimelineEvent {
  return { day_index: dayIndex, start_time: "08:00", title: "", location: "", notes: "" };
}

export function TimelineBuilder({ events, onChange }: Props) {
  const dayIndexes = Array.from(new Set(events.map((e) => e.day_index))).sort((a, b) => a - b);
  const maxDay = dayIndexes.length ? Math.max(...dayIndexes) : 0;

  function updateEvent(index: number, patch: Partial<TimelineEvent>) {
    const next = events.map((e, i) => (i === index ? { ...e, ...patch } : e));
    onChange(next);
  }

  function removeEvent(index: number) {
    onChange(events.filter((_, i) => i !== index));
  }

  function moveEvent(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= events.length) return;
    const next = [...events];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addEvent(dayIndex: number) {
    onChange([...events, emptyEvent(dayIndex)]);
  }

  function addDay() {
    onChange([...events, emptyEvent(maxDay + 1)]);
  }

  return (
    <div className="flex flex-col gap-6">
      {dayIndexes.map((day) => (
        <div key={day} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Ngày {day}</h3>
          <div className="flex flex-col gap-2">
            {events.map((event, index) =>
              event.day_index === day ? (
                <div key={index} className="flex flex-col gap-2 rounded-md border border-border p-3">
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      className="w-28"
                      value={event.start_time}
                      onChange={(e) => updateEvent(index, { start_time: e.target.value })}
                    />
                    <Input
                      className="flex-1"
                      placeholder="Tên hoạt động"
                      value={event.title}
                      onChange={(e) => updateEvent(index, { title: e.target.value })}
                    />
                  </div>
                  <Input
                    placeholder="Địa điểm"
                    value={event.location ?? ""}
                    onChange={(e) => updateEvent(index, { location: e.target.value })}
                  />
                  <Textarea
                    placeholder="Lưu ý (trang phục, vật dụng cần mang...)"
                    value={event.notes ?? ""}
                    onChange={(e) => updateEvent(index, { notes: e.target.value })}
                  />
                  <div className="flex justify-end gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => moveEvent(index, -1)}>
                      ↑
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => moveEvent(index, 1)}>
                      ↓
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeEvent(index)}>
                      Xoá
                    </Button>
                  </div>
                </div>
              ) : null
            )}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => addEvent(day)} className="self-start">
            + Thêm mốc cho ngày {day}
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addDay} className="self-start">
        + Thêm ngày mới
      </Button>
    </div>
  );
}
