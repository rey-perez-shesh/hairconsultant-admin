"use client";

import { RefreshCw, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/admin-api";
import { formatNumber } from "@/lib/format";

export function BackfillButton({ label = "Recalculate stats" }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const counts = await api.backfillStats();
          toast.success(
            `Stats rebuilt from ${formatNumber(counts.users)} users, ${formatNumber(counts.consultations)} consultations and ${formatNumber(counts.feedback)} reviews.`,
          );
        } catch (error) {
          toast.error(errorMessage(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <RefreshCw className={busy ? "animate-spin" : undefined} />
      {busy ? "Recalculating…" : label}
    </Button>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={n <= rating ? "size-3.5 fill-highlight text-highlight" : "size-3.5 text-muted-foreground/35"}
        />
      ))}
    </span>
  );
}

/**
 * Controlled confirmation dialog. With [confirmText], the action stays disabled until that exact
 * text is typed (used for irreversible deletes).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  destructive = false,
  confirmText,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  actionLabel: string;
  destructive?: boolean;
  confirmText?: string;
  onConfirm: () => Promise<void> | void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const blocked = confirmText !== undefined && typed.trim() !== confirmText;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped("");
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {confirmText !== undefined && (
          <div className="space-y-2 text-sm">
            <p>
              Type <span className="font-mono font-medium">{confirmText}</span> to confirm.
            </p>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={blocked || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                setTyped("");
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Working…" : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Fixed ink per face shape, used on every tag, chart and filter so a shape reads the same everywhere. */
export const FACE_SHAPE_INK: Record<string, string> = {
  OVAL: "bg-face-oval",
  ROUND: "bg-face-round",
  SQUARE: "bg-face-square",
  HEART: "bg-face-heart",
  DIAMOND: "bg-face-diamond",
};

export function FaceShapeTag({ shape, label, className = "text-xs" }: { shape: string; label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
      <span className={`size-2 rounded-[2px] ${FACE_SHAPE_INK[shape] ?? "bg-muted-foreground"}`} aria-hidden />
      {label}
    </span>
  );
}
