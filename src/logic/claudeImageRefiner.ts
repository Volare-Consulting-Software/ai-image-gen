import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { query, type Options } from "@anthropic-ai/claude-agent-sdk";

import type { ImageRefiner, RefineInput } from "@/interfaces/imageRefiner";
import { logger } from "@/lib/logger";
import type { GeneratedImage } from "@/types/generation";

// Where node can resolve the `sharp` package from when Claude runs a script
// inside the scratch cwd. Points at this project's node_modules.
const PROJECT_NODE_MODULES = join(process.cwd(), "node_modules");

// Candidate output files, in priority order, with their mime types. The agent
// writes whichever format the requested operation calls for (e.g. PNG for
// transparency, WebP/JPEG for a format conversion).
const OUTPUT_CANDIDATES: Array<{ file: string; mimeType: string }> = [
  { file: "output.png", mimeType: "image/png" },
  { file: "output.webp", mimeType: "image/webp" },
  { file: "output.jpg", mimeType: "image/jpeg" },
  { file: "output.jpeg", mimeType: "image/jpeg" },
];

const SYSTEM_PROMPT = `You are an expert image engineer. You perform precise,
deterministic edits to the TECHNICAL properties of an existing image without
changing what it depicts or its artistic style. Your responsibilities include:

- Sharpness / clarity, denoising, color balance, saturation, contrast and levels.
- Cleaning up jagged lines, edges, circles and shapes.
- Fixing AI-generation artifacts: abrupt or illogical color transitions, stray
  white/empty patches where colors should blend continuously, color banding, and
  blotches — smooth them so adjacent colors flow together naturally.
- Scaling / resizing and upscaling.
- Format / type conversion (PNG, JPEG, WebP).
- Background removal and transparency (alpha channel).
- Layering / compositing (e.g. placing the subject on a new background or layer).

You work entirely with command-line tools in the current directory:
- Prefer a small Node script using the installed "sharp" library (cross-platform,
  always available) for resize/sharpen/modulate/normalize/gamma/flatten/extend
  and alpha operations.
- ImageMagick ("magick" / "convert") is also available for more advanced filters,
  compositing, and background removal.

Hard rules:
- The input image is the file ./input.png in the current directory. Read it to see it.
- Write exactly one result to ./output.png — UNLESS the request is a format change,
  in which case write ./output.jpg or ./output.webp instead. Use PNG (or WebP) when
  transparency is needed; never write a transparent image as JPEG.
- Do NOT change what the picture depicts or its artistic style — only its technical
  properties.
- Do NOT access the network. When finished, briefly state what you changed.`;

export class ClaudeImageRefiner implements ImageRefiner {
  private readonly model: string;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    this.model = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
  }

  async refine(input: RefineInput): Promise<GeneratedImage> {
    const scratch = join(tmpdir(), "aig", input.projectId, String(input.roundIndex));
    await mkdir(scratch, { recursive: true });

    // We always normalise the working file to input.png so the agent prompt is
    // stable; the source bytes keep their original encoding inside the PNG-named
    // file (sharp/ImageMagick sniff the real format from content).
    const inputPath = join(scratch, "input.png");
    await writeFile(inputPath, input.source);

    const prompt = `Refine ./input.png and save the result as ./output.png (or
./output.jpg / ./output.webp if the request is a format change).

What to do:
${input.instructions}

Read ./input.png first to assess it, then apply the change and write the output file.`;

    const options: Options = {
      cwd: scratch,
      model: this.model,
      allowedTools: ["Read", "Write", "Bash", "Glob"],
      disallowedTools: ["WebFetch", "WebSearch", "AskUserQuestion"],
      permissionMode: "bypassPermissions",
      // Isolate from the developer's ~/.claude settings.
      settingSources: [],
      systemPrompt: SYSTEM_PROMPT,
      maxTurns: 30,
      env: { ...process.env, NODE_PATH: PROJECT_NODE_MODULES },
    };

    let usage: GeneratedImage["usage"];
    try {
      for await (const message of query({ prompt, options })) {
        if (message.type === "result") {
          usage = {
            model: this.model,
            inputTokens: message.usage?.input_tokens,
            outputTokens: message.usage?.output_tokens,
            costUsd: message.total_cost_usd,
          };
          if (message.subtype !== "success") {
            logger.warn(
              { subtype: message.subtype, projectId: input.projectId },
              "claude refine ended without success",
            );
          } else {
            logger.debug(
              { costUsd: message.total_cost_usd, turns: message.num_turns },
              "claude refine complete",
            );
          }
        }
      }

      // Pick whichever output the agent produced (supports format conversion).
      for (const candidate of OUTPUT_CANDIDATES) {
        const data = await readFile(join(scratch, candidate.file)).catch(() => null);
        if (data) {
          return { data, mimeType: candidate.mimeType, usage };
        }
      }
      throw new Error("Claude refinement did not produce an output image");
    } finally {
      // Best-effort cleanup of this round's scratch dir.
      await rm(scratch, { recursive: true, force: true }).catch(() => {});
    }
  }
}
