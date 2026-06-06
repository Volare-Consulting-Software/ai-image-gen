import { ApiError, GoogleGenAI, Type, type GenerateContentResponse, type Part } from "@google/genai";

import type { ImageGenerator } from "@/interfaces/imageGenerator";
import { logger } from "@/lib/logger";
import { estimateCostUsd } from "@/logic/pricing";
import type { ClarificationAnswer, ClarificationResult } from "@/types/clarification";
import {
  GeminiApiError,
  NoImageError,
  type GeneratedImage,
  type ReferenceImage,
} from "@/types/generation";

const DEFAULT_MAX_QUESTIONS = 5;

function clarifySystem(maxQuestions: number): string {
  return `You help a user turn a rough idea into a precise prompt for an AI image
generator. Inspect the prompt and find what is UNDERSPECIFIED, then ask focused
questions — each only if it would meaningfully change the resulting image — covering
whichever of these dimensions are unclear:
- Subject & key elements (what exactly is in the image)
- Setting / background / context
- Composition & framing (close-up vs wide, angle, where the subject sits)
- Art style / medium / rendering (photo, flat illustration, 3D, watercolor, line art…)
- Mood & lighting
- Color palette
- Level of detail / complexity (minimal vs intricate)
- Any text, logo, or branding to include
- Intended use & aspect ratio (icon, banner, poster, square…)
- Anything to avoid

Rules:
- Ask up to ${maxQuestions} questions — but only ones that genuinely matter for THIS prompt.
- A short or generic prompt is vague: lean toward asking. Only set isVague=false when the
  prompt is already detailed enough to produce a confident, specific result.
- For every question, give a one-line "why" and 3–5 concrete "options" the user can pick from.
- Keep questions short and concrete.
- Also return a concise "title" (max 6 words) that names the image to create.`;
}

const REFINE_SYSTEM = `You are a prompt engineer for an AI image generator. Produce ONE
refined image prompt by STARTING FROM the user's original request and KEEPING IT INTACT.
Its subject and any specific action it asks for MUST survive — this includes
edit/transform instructions ("rotate", "remove", "recolor", "make them face forward")
and any reference to an attached or existing image. Never invent a new subject or replace
the request with a generic scene.

Then weave in the user's clarifying answers as ADDITIONAL constraints only. If an answer
says to keep something "the same" or "no change", do NOT fabricate new descriptors for it
— leave that aspect to the original/reference image. Add concrete detail only where the
user actually supplied it; do not pad with generic scene description the user never asked
for.

Output ONLY the final prompt — no preamble, no quotes, no explanation.`;

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
    const maxQuestions = Number(process.env.CLARIFY_MAX_QUESTIONS) || DEFAULT_MAX_QUESTIONS;
    const response = await this.callModel({
      model: this.textModel,
      contents: `Prompt: "${prompt}"`,
      config: {
        systemInstruction: clarifySystem(maxQuestions),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isVague: { type: Type.BOOLEAN },
            title: { type: Type.STRING },
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
          required: ["isVague", "title", "questions"],
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
        questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, maxQuestions) : [],
        title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : undefined,
      };
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, "clarify parse failed");
      return { isVague: false, questions: [] };
    }
  }

  async refinePrompt(original: string, answers: ClarificationAnswer[]): Promise<string> {
    const answered = answers.filter((a) => a.answer.trim().length > 0);
    const qa = answered.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n");
    const fallback = qa ? `${original}\n\n${qa}` : original;
    if (answered.length === 0) return original;

    try {
      const response = await this.callModel({
        model: this.textModel,
        contents: `Original idea: ${original}\n\nUser's answers:\n${qa}`,
        config: { systemInstruction: REFINE_SYSTEM },
      });
      const text = response.text?.trim();
      return text && text.length > 0 ? text : fallback;
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        "refinePrompt failed; falling back to concatenation",
      );
      return fallback;
    }
  }

  async generateCandidates(
    prompt: string,
    count: number,
    reference?: ReferenceImage,
  ): Promise<GeneratedImage[]> {
    // Text-only by default; when a reference photo is attached, send it inline
    // alongside the prompt so it influences the generation.
    const contents: string | Part[] = reference
      ? [
          { text: `${prompt}\n\nUse the attached image as a style/subject reference.` },
          { inlineData: { mimeType: reference.mimeType, data: reference.data.toString("base64") } },
        ]
      : prompt;

    // The image API doesn't expose a candidate count for image output, so we
    // fan out independent calls to get distinct variations.
    const calls = Array.from({ length: count }, () => this.requestImage(contents));
    return Promise.all(calls);
  }

  // Single chokepoint for model calls so SDK transport failures (rate limits,
  // auth, server errors) surface as a friendly GeminiApiError everywhere.
  private async callModel(
    params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  ): Promise<GenerateContentResponse> {
    try {
      return await this.ai.models.generateContent(params);
    } catch (err) {
      if (err instanceof ApiError) {
        throw new GeminiApiError(err.message, err.status);
      }
      throw err;
    }
  }

  private usageFrom(response: GenerateContentResponse): GeneratedImage["usage"] {
    const um = response.usageMetadata;
    const inputTokens = um?.promptTokenCount;
    const outputTokens = um?.candidatesTokenCount;
    return {
      model: this.imageModel,
      inputTokens,
      outputTokens,
      costUsd: estimateCostUsd(this.imageModel, inputTokens, outputTokens),
    };
  }

  async editImage(
    source: Buffer,
    mimeType: string,
    instruction: string,
    reference?: ReferenceImage,
  ): Promise<GeneratedImage> {
    // With a reference, two images go to the model — disambiguate which is the
    // edit target and which is the inspiration via an explicit FIRST/SECOND note.
    const contents: Part[] = [
      {
        text: reference
          ? `${instruction}\n\nThe FIRST image is the current image to edit. The SECOND image is a reference to draw style/inspiration from.`
          : instruction,
      },
      { inlineData: { mimeType, data: source.toString("base64") } },
    ];
    if (reference) {
      contents.push({
        inlineData: { mimeType: reference.mimeType, data: reference.data.toString("base64") },
      });
    }

    return this.requestImage(contents);
  }

  // Call the image model once. If it answers with text instead of an image (a
  // refusal or clarifying remark), surface that text and the reason rather than
  // retrying — no point spending tokens on a model that just declined.
  private async requestImage(contents: string | Part[]): Promise<GeneratedImage> {
    const response = await this.callModel({
      model: this.imageModel,
      contents,
    });
    const image = this.tryExtractImage(response);
    if (image) return image;

    // No image: capture the structured reason and any text the model returned.
    const { reason, text } = this.noImageReason(response);
    const message = `Gemini did not return an image${reason ? ` (${reason})` : ""}${text ? `: ${text}` : ""}`;
    // The call still consumed (and billed) input tokens — carry the usage so it
    // can be recorded against the failed job.
    throw new NoImageError(message, this.usageFrom(response), reason, text);
  }

  private tryExtractImage(response: GenerateContentResponse): GeneratedImage | null {
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return {
          data: Buffer.from(part.inlineData.data, "base64"),
          mimeType: part.inlineData.mimeType ?? "image/png",
          usage: this.usageFrom(response),
        };
      }
    }
    return null;
  }

  // Why a response had no image: the structured finish/block reason code and any
  // text the model returned instead (usually a refusal or clarifying remark).
  private noImageReason(response: GenerateContentResponse): { reason?: string; text?: string } {
    const candidate = response.candidates?.[0];
    const text =
      (candidate?.content?.parts ?? [])
        .map((p) => p.text)
        .filter(Boolean)
        .join(" ")
        .trim() || undefined;
    const reason = candidate?.finishReason ?? response.promptFeedback?.blockReason ?? undefined;
    return { reason, text };
  }
}
