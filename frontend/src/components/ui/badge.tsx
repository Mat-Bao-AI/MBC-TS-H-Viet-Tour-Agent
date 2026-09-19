import { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-muted text-muted-foreground",
      primary: "bg-primary text-primary-foreground",
      success: "bg-green-100 text-green-800",
      warning: "bg-amber-100 text-amber-800",
      destructive: "bg-red-100 text-red-800",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const TOUR_STATUS_LABEL: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  draft: { label: "Nháp", variant: "default" },
  parsing: { label: "Đang phân tích...", variant: "warning" },
  review: { label: "Cần kiểm tra", variant: "primary" },
  ready_to_send: { label: "Sẵn sàng gửi", variant: "success" },
  dispatched: { label: "Đã gửi", variant: "success" },
  failed: { label: "Lỗi", variant: "destructive" },
  pending: { label: "Chưa gửi", variant: "default" },
  sent: { label: "Đã gửi", variant: "success" },
  read: { label: "Đã đọc", variant: "success" },
  confirmed: { label: "Đã xác nhận", variant: "success" },
};

export function StatusBadge({ status }: { status: string }) {
  const info = TOUR_STATUS_LABEL[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}
