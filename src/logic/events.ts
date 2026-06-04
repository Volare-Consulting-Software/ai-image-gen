import { EventEmitter } from "node:events";

// Process-wide event bus. Used to nudge the job processor to run a tick
// immediately after a job is enqueued, instead of waiting for the next poll.
export const bus = new EventEmitter();

export const JOB_NUDGE = "job:nudge";

export function nudgeJobs(): void {
  bus.emit(JOB_NUDGE);
}
