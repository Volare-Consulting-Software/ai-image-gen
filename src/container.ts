import "reflect-metadata";

import { container, instanceCachingFactory } from "tsyringe";

import { ImageGeneratorToken, type ImageGenerator } from "@/interfaces/imageGenerator";
import { ImageRefinerToken, type ImageRefiner } from "@/interfaces/imageRefiner";
import { StorageToken, type Storage } from "@/interfaces/storage";
import { ClaudeImageRefiner } from "@/logic/claudeImageRefiner";
import { GeminiImageGenerator } from "@/logic/geminiImageGenerator";
import { S3Storage } from "@/logic/s3Storage";

// Implementations are built lazily on first resolve (env is read in their
// constructors), then cached for the process lifetime.
container.register<Storage>(StorageToken, {
  useFactory: instanceCachingFactory<Storage>(() => new S3Storage()),
});

container.register<ImageGenerator>(ImageGeneratorToken, {
  useFactory: instanceCachingFactory<ImageGenerator>(() => new GeminiImageGenerator()),
});

container.register<ImageRefiner>(ImageRefinerToken, {
  useFactory: instanceCachingFactory<ImageRefiner>(() => new ClaudeImageRefiner()),
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
