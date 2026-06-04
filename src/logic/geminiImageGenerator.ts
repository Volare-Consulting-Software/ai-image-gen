import { GoogleGenAI, Type, type GenerateContentResponse } from "@google/genai";

import type { ImageGenerator } from "@/interfaces/imageGenerator";
import { logger } from "@/lib/logger";
import type { ClarificationResult } from "@/types/clarification";
import type { GeneratedImage } from "@/types/generation";

const CLARIFY_SYSTEM = `You help a user sharpen a prompt for an AI image generator.
Decide whether the prompt is too vague to produce a confident result.

Only ask questions that would SIGNIFICANTLY change the resulting image — things like:
subject & key elements, composition/framing, art style or medium, mood/tone, color
palette, setting/background, and intended use or aspect ratio. Do NOT ask filler
questions. Ask at most 3. If the prompt is already specific enough to generate a
strong image, set isVague to false and return an empty questions array.`;

export class GeminiImageGenerator implements ImageGenerator {
  private readonly ai: GoogleGenAI;
  private readonly imageModel: string;
  private readonly textModel: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY (or GOOGLE_API_KEY) is not set");
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.imageModel = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
    this.textModel = process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";
  }

  async clarify(prompt: string): Promise<ClarificationResult> {
    const response = await this.ai.models.generateContent({
      model: this.textModel,
      contents: `Prompt: "${prompt}"`,
      config: {
        systemInstruction: CLARIFY_SYSTEM,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isVague: { type: Type.BOOLEAN },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  why: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["question", "why"],
              },
            },
          },
          required: ["isVague", "questions"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      logger.warn("clarify returned no text; treating prompt as clear");
      return { isVague: false, questions: [] };
    }
    try {
      const parsed = JSON.parse(text) as ClarificationResult;
      return {
        isVague: Boolean(parsed.isVague),
        questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 3) : [],
      };
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, "clarify parse failed");
      return { isVague: false, questions: [] };
    }
  }

  async generateCandidates(prompt: string, count: number): Promise<GeneratedImage[]> {
    // The image API doesn't expose a candidate count for image output, so we
    // fan out independent calls to get distinct variations.
    const calls = Array.from({ length: count }, () =>
      this.ai.models.generateContent({ model: this.imageModel, contents: prompt }),
    );
    const responses = await Promise.all(calls);
    return responses.map((r) => this.extractImage(r));
  }

  async editImage(source: Buffer, mimeType: string, instruction: string): Promise<GeneratedImage> {
    const response = await this.ai.models.generateContent({
      model: this.imageModel,
      contents: [
        { text: instruction },
        { inlineData: { mimeType, data: source.toString("base64") } },
      ],
    });
    return this.extractImage(response);
  }

  private extractImage(response: GenerateContentResponse): GeneratedImage {
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return {
          data: Buffer.from(part.inlineData.data, "base64"),
          mimeType: part.inlineData.mimeType ?? "image/png",
        };
      }
    }
    throw new Error("Gemini returned no image data");
  }
}
