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

const SYSTEM_PROMPT = `You are an expert image-retouching engineer. You improve the
TECHNICAL quality of an existing image without changing its subject, composition,
or artistic style. Focus on: sharpness/clarity, denoising, color balance and
saturation, contrast/levels, and cleaning up jagged lines, edges, circles and
shapes.

You work entirely with command-line tools in the current directory:
- Prefer a small Node script using the installed "sharp" library (cross-platform,
  always available) for resize/sharpen/modulate/normalize/gamma operations.
- ImageMagick ("magick" / "convert") is also available for more advanced filters.

Hard rules:
- The input image is the file ./input.png in the current directory. Read it to see it.
- Produce exactly one result written to ./output.png in the current directory.
- Do NOT change what the picture depicts or its style — only refine quality.
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
    const outputPath = join(scratch, "output.png");
    await writeFile(inputPath, input.source);

    const prompt = `Refine ./input.png and save the improved image as ./output.png.

Refinement guidance:
${input.instructions}

Read ./input.png first to assess it, then apply the improvements and write ./output.png.`;

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

    try {
      for await (const message of query({ prompt, options })) {
        if (message.type === "result") {
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

      const data = await readFile(outputPath).catch(() => null);
      if (!data) {
        throw new Error("Claude refinement did not produce output.png");
      }
      return { data, mimeType: input.mimeType };
    } finally {
      // Best-effort cleanup of this round's scratch dir.
      await rm(scratch, { recursive: true, force: true }).catch(() => {});
    }
  }
}
