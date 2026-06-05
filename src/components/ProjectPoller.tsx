"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// While the project has work in flight, refresh the server component on an
// interval so the new images / next gate appear without a manual reload.
export function ProjectPoller({ active, intervalMs = 2500 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);
  return null;
}
