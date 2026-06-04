import { describe, expect, it } from "vitest";
import sharp from "sharp";

import { FixtureImageGenerator } from "@/logic/fixtureImageGenerator";

const gen = new FixtureImageGenerator();

describe("FixtureImageGenerator", () => {
  it("generateCandidates_returnsRequestedCountOfValidPngs", async () => {
    const images = await gen.generateCandidates("a logo", 3);
    expect(images).toHaveLength(3);
    for (const img of images) {
      expect(img.mimeType).toBe("image/png");
      const meta = await sharp(img.data).metadata();
      expect(meta.format).toBe("png");
      expect(meta.width).toBeGreaterThan(0);
    }
  });

  it("clarify_returnsHighImpactQuestions", async () => {
    const result = await gen.clarify("something");
    expect(result.isVague).toBe(true);
    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.questions[0]?.why).toBeTruthy();
  });

  it("editImage_transformsSourceIntoValidPng", async () => {
    const [source] = await gen.generateCandidates("x", 1);
    const edited = await gen.editImage(source!.data, "image/png", "warmer");
    const meta = await sharp(edited.data).metadata();
    expect(meta.format).toBe("png");
  });
});
