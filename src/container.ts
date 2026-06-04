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

// AI_PROVIDER=fixtures runs the whole flow offline with zero API cost (canned
// questions + sharp-generated placeholder images). Anything else (default) uses
// the real Gemini + Claude engines. Storage is always S3/MinIO.
const useFixtures = process.env.AI_PROVIDER === "fixtures";

// Implementations are built lazily on first resolve (env is read in their
// constructors), then cached for the process lifetime.
container.register<Storage>(StorageToken, {
  useFactory: instanceCachingFactory<Storage>(() => new S3Storage()),
});

container.register<ImageGenerator>(ImageGeneratorToken, {
  useFactory: instanceCachingFactory<ImageGenerator>(() =>
    useFixtures ? new FixtureImageGenerator() : new GeminiImageGenerator(),
  ),
});

container.register<ImageRefiner>(ImageRefinerToken, {
  useFactory: instanceCachingFactory<ImageRefiner>(() =>
    useFixtures ? new FixtureImageRefiner() : new ClaudeImageRefiner(),
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
