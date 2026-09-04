"use client";

// Tabs đơn giản (underline style) — theo đúng screen Stitch "Cài đặt hệ thống"
// (project 8575116696704742662). Không dùng Radix, giữ nhẹ như các
// component ui/ khác trong repo.
import { cn } from "@/lib/utils";

export type TabItem = {
  key: string;
  label: string;
};

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-5 border-b border-border">
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={cn(
              "-mb-px border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
