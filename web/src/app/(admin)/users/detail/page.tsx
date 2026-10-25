"use client";

import { Suspense } from "react";
import { UserDetail } from "./user-detail";

export default function UserDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <UserDetail />
    </Suspense>
  );
}
