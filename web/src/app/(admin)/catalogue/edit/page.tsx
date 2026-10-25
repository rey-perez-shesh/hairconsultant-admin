"use client";

import { Suspense } from "react";
import { HaircutEditor } from "./haircut-editor";

// The style id comes from ?id= (static export can't pre-render one page per Firestore document).
export default function EditHaircutPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <HaircutEditor />
    </Suspense>
  );
}
