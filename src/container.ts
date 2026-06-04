import "reflect-metadata";

import { container, instanceCachingFactory } from "tsyringe";

import { ImageGeneratorToken, type ImageGenerator } from "@/interfaces/imageGenerator";
import { ImageRefinerToken, type ImageRefiner } from "@/interfaces/imageRefiner";
import { StorageToken, type Storage } from "@/interfaces/storage";
import { ClaudeImageRefiner } from "@/logic/claudeImageRefiner";
import { FixtureImageGenerator } from "@/logic/fixtureImageGenerator";
import { FixtureImageRefiner } from "@/logic/fixtureImageRefiner";
import { GeminiImageGenerator } from "@/logic/geminiImageGenerator";
import { S3Storage } from "@/logic/s3Storage";

// Provider mode is resolved per engine so you can mix live + fixtures — e.g.
// test real Gemini (nano-banana) while keeping Claude on the free fixture pass
// until you have an Anthropic key. `AI_PROVIDER` is the default for both;
// `GEMINI_PROVIDER` / `CLAUDE_PROVIDER` override individually. Default: live.
// "fixtures" runs offline with zero API cost. Storage is always S3/MinIO.
function usesFixtures(engineOverride: string | undefined): boolean {
  return (engineOverride ?? process.env.AI_PROVIDER ?? "live") === "fixtures";
}

const geminiFixtures = usesFixtures(process.env.GEMINI_PROVIDER);
const claudeFixtures = usesFixtures(process.env.CLAUDE_PROVIDER);

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
  useFactory: instanceCachingFactory<ImageRefiner>(() =>
    claudeFixtures ? new FixtureImageRefiner() : new ClaudeImageRefiner(),
  ),
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
