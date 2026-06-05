import type { HandoffTask } from "@/logic/handoffRegistry";

// A self-contained prompt you can paste into ANY Claude (Code) session: it
// fetches the source image, refines it per the app's instructions, and posts the
// result back — at which point the paused project continues.
export function buildHandoffBrief(task: Omit<HandoffTask, "source">, baseUrl: string): string {
  const sourceUrl = `${baseUrl}/api/handoff/${task.id}/source`;
  const resultUrl = `${baseUrl}/api/handoff/${task.id}/result`;
  return `You are an image-refinement worker for the "ai-image-gen" app. Do this one task, then stop.

1. Download the source image:
   curl -s "${sourceUrl}" -o input.png

2. Refine input.png per these instructions. Preserve the subject, composition,
   and artistic style — only change what's asked:
   ${task.instructions}
   Use local image tools (the "sharp" Node library, or ImageMagick "magick").
   Save the result as output.png (PNG keeps transparency; only output JPEG/WebP
   if a format change is requested).

3. Post the refined image back:
   curl -s -X POST "${resultUrl}" -H "Content-Type: image/png" --data-binary @output.png
   If you know your token usage for this task, also add headers:
   -H "x-input-tokens: <n>" -H "x-output-tokens: <n>" -H "x-model: <model>"

The app is waiting on task id ${task.id}; posting the result resumes it.`;
}
