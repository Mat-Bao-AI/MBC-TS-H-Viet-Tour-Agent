"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  tourId: string;
  guestId: string;
  onClose: () => void;
};

export function ZaloPreview({ tourId, guestId, onClose }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .previewMessage(tourId, guestId)
      .then((res) => {
        setText(res.message_text);
        setGuestName(res.guest_name);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [tourId, guestId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Xem trước tin nhắn Zalo — {guestName}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!text && !error && <p className="text-sm text-muted-foreground">Đang tải...</p>}
          {text && (
            <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
              {text}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
