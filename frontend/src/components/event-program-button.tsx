"use client";

// "Xem chương trình & gợi ý" — chỉ hiện khi AI nhận diện mốc là sự kiện
// chính có chương trình chi tiết riêng trong tài liệu nguồn (xem
// backend/app/schemas/timeline.py EventProgramSchema, timeline_agent.py).
// Dùng chung cho cả trang review (HDV) lẫn trang công khai (khách/đồng
// nghiệp xem) — program không chứa dữ liệu cá nhân khách nên an toàn hiện
// cả ở trang public.
import { useState } from "react";
import { EventProgram } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EventProgramButton({
  title,
  timeLabel,
  program,
}: {
  title: string;
  timeLabel: string;
  program: EventProgram;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" className="self-start" onClick={() => setOpen(true)}>
        Xem chương trình & gợi ý →
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <Card className="max-h-[85vh] w-full max-w-lg overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>{title}</CardTitle>
                <p className="text-xs text-muted-foreground">{timeLabel}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              {(program.organizer || program.attendees) && (
                <div className="flex flex-col gap-1 rounded-md bg-muted p-3 text-xs">
                  {program.organizer && (
                    <p>
                      <span className="font-semibold">Tổ chức:</span> {program.organizer}
                    </p>
                  )}
                  {program.attendees && (
                    <p>
                      <span className="font-semibold">Thành phần:</span> {program.attendees}
                    </p>
                  )}
                </div>
              )}

              {program.agenda.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Chương trình
                  </p>
                  <div className="flex flex-col divide-y divide-border rounded-md border border-border">
                    {program.agenda.map((item, i) => (
                      <div key={i} className="flex gap-3 p-2.5">
                        {item.time && (
                          <span className="w-20 shrink-0 text-xs font-semibold text-primary">{item.time}</span>
                        )}
                        <div>
                          <p>{item.content}</p>
                          {item.speaker && <p className="text-xs italic text-muted-foreground">{item.speaker}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(program.contact_name || program.contact_phone) && (
                <div className="rounded-md border border-border bg-card p-3 text-xs">
                  <p className="mb-0.5 font-semibold uppercase tracking-wide text-muted-foreground">Liên hệ BTC</p>
                  {[program.contact_name, program.contact_phone].filter(Boolean).join(" — ")}
                </div>
              )}

              {program.suggestions.length > 0 && (
                <div className="rounded-md border border-success/30 bg-success/10 p-3 text-xs text-success">
                  <p className="mb-1 font-semibold">💡 Gợi ý</p>
                  <ul className="list-disc space-y-1 pl-4">
                    {program.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
