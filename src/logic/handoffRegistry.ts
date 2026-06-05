import { randomUUID } from "node:crypto";

import type { GeneratedImage } from "@/types/generation";

// A polish step handed off to an external worker (the developer's Claude Code
// session). The job awaits the returned promise until the result is posted back.
export interface HandoffTask {
  id: string;
  projectId: string;
  sourceImageId: string;
  roundIndex: number;
  instructions: string;
  mimeType: string;
  createdAt: string;
  source: Buffer;
}

interface Pending {
  task: HandoffTask;
  resolve: (img: GeneratedImage) => void;
  reject: (err: Error) => void;
}

// Back the registry on globalThis so all module instances (the instrumentation
// runner and the route handlers, which Next can bundle separately) share ONE
// map, and so it survives HMR module reloads. Local single-instance dev only.
const globalForHandoffs = globalThis as unknown as { __aigHandoffs?: Map<string, Pending> };
const pending: Map<string, Pending> =
  globalForHandoffs.__aigHandoffs ?? (globalForHandoffs.__aigHandoffs = new Map());

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

export function createHandoff(
  input: Omit<HandoffTask, "id" | "createdAt">,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<GeneratedImage> {
  const id = randomUUID();
  const task: HandoffTask = { ...input, id, createdAt: new Date().toISOString() };
  return new Promise<GeneratedImage>((resolve, reject) => {
    pending.set(id, { task, resolve, reject });
    const timer = setTimeout(() => {
      if (pending.delete(id)) {
        reject(new Error("Handoff timed out waiting for a posted result"));
      }
    }, timeoutMs);
    if (timer.unref) timer.unref();
  });
}

// Pending tasks without their image bytes (for the list endpoint).
export function listHandoffs(): Array<Omit<HandoffTask, "source">> {
  return [...pending.values()].map(({ task }) => {
    const { source: _source, ...rest } = task;
    return rest;
  });
}

export function getHandoffSource(id: string): { data: Buffer; mimeType: string } | null {
  const entry = pending.get(id);
  return entry ? { data: entry.task.source, mimeType: entry.task.mimeType } : null;
}

// The pending handoff for a given project (without bytes), if any.
export function getHandoffForProject(projectId: string): Omit<HandoffTask, "source"> | null {
  for (const { task } of pending.values()) {
    if (task.projectId === projectId) {
      const { source: _source, ...rest } = task;
      return rest;
    }
  }
  return null;
}

// Resolve a handoff with the posted result; the awaiting job then continues.
export function resolveHandoff(id: string, result: GeneratedImage): boolean {
  const entry = pending.get(id);
  if (!entry) return false;
  pending.delete(id);
  entry.resolve(result);
  return true;
}
