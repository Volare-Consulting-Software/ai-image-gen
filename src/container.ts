import "reflect-metadata";

import { container, instanceCachingFactory } from "tsyringe";

import { ImageGeneratorToken, type ImageGenerator } from "@/interfaces/imageGenerator";
import { ImageRefinerToken, type ImageRefiner } from "@/interfaces/imageRefiner";
import { StorageToken, type Storage } from "@/interfaces/storage";
import { ClaudeImageRefiner } from "@/logic/claudeImageRefiner";
import { FixtureImageGenerator } from "@/logic/fixtureImageGenerator";
import { FixtureImageRefiner } from "@/logic/fixtureImageRefiner";
import { GeminiImageGenerator } from "@/logic/geminiImageGenerator";
import { HandoffImageRefiner } from "@/logic/handoffImageRefiner";
import { S3Storage } from "@/logic/s3Storage";

// Provider mode is resolved per engine so you can mix modes. `AI_PROVIDER` is the
// default for both; `GEMINI_PROVIDER` / `CLAUDE_PROVIDER` override individually.
// "fixtures" runs offline with zero API cost; the Claude engine additionally
// supports "handoff" (pause and let an external Claude Code session do the
// polish, posting the result back). Default: "live". Storage is always S3/MinIO.
function modeOf(engineOverride: string | undefined): string {
  return engineOverride ?? process.env.AI_PROVIDER ?? "live";
}

const geminiFixtures = modeOf(process.env.GEMINI_PROVIDER) === "fixtures";
const claudeMode = modeOf(process.env.CLAUDE_PROVIDER);

function makeRefiner(): ImageRefiner {
  if (claudeMode === "handoff") return new HandoffImageRefiner();
  if (claudeMode === "fixtures") return new FixtureImageRefiner();
  return new ClaudeImageRefiner();
}

// Implementations are built lazily on first resolve (env is read in their
// constructors), then cached for the process lifetime.
container.register<Storage>(StorageToken, {
  useFactory: instanceCachingFactory<Storage>(() => new S3Storage()),
});

container.register<ImageGenerator>(ImageGeneratorToken, {
  useFactory: instanceCachingFactory<ImageGenerator>(() =>
    geminiFixtures ? new FixtureImageGenerator() : new GeminiImageGenerator(),
  ),
});

container.register<ImageRefiner>(ImageRefinerToken, {
  useFactory: instanceCachingFactory<ImageRefiner>(makeRefiner),
});

export function getStorage(): Storage {
  return container.resolve<Storage>(StorageToken);
}

export function getImageGenerator(): ImageGenerator {
  return container.resolve<ImageGenerator>(ImageGeneratorToken);
}

export function getImageRefiner(): ImageRefiner {
  return container.resolve<ImageRefiner>(ImageRefinerToken);
}
