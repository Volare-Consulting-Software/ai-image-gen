import sharp from "sharp";

import type { ImageGenerator } from "@/interfaces/imageGenerator";
import type { ClarificationResult } from "@/types/clarification";
import type { GeneratedImage } from "@/types/generation";

const SIZE = 768;
const BACKGROUNDS = ["#1e3a8a", "#7c3aed", "#0f766e", "#b45309", "#be123c", "#155e75"];

function pick<T>(arr: T[], i: number): T {
  return arr[((i % arr.length) + arr.length) % arr.length] as T;
}

// A geometric, font-free placeholder so dev never depends on system fonts.
async function placeholder(variant: number): Promise<GeneratedImage> {
  const bg = pick(BACKGROUNDS, variant);
  const fg = pick(BACKGROUNDS, variant + 3);
  const cx = 30 + ((variant * 17) % 40);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
    <rect width="100%" height="100%" fill="${bg}"/>
    <circle cx="${(cx / 100) * SIZE}" cy="${SIZE * 0.4}" r="${SIZE * 0.22}" fill="${fg}" opacity="0.8"/>
    <rect x="${SIZE * 0.15}" y="${SIZE * 0.62}" width="${SIZE * 0.7}" height="${SIZE * 0.12}" rx="16" fill="#ffffff" opacity="0.85"/>
    <rect x="${SIZE * 0.15}" y="${SIZE * 0.78}" width="${SIZE * 0.45}" height="${SIZE * 0.06}" rx="12" fill="#ffffff" opacity="0.55"/>
  </svg>`;
  const data = await sharp(Buffer.from(svg)).png().toBuffer();
  return { data, mimeType: "image/png", width: SIZE, height: SIZE };
}

// Zero-cost stand-in for Gemini. Returns canned clarifying questions and
// geometric placeholder images, and applies a real (visible) sharp transform on
// edits so the whole pipeline — storage, history, UI — is exercised offline.
export class FixtureImageGenerator implements ImageGenerator {
  async clarify(_prompt: string): Promise<ClarificationResult> {
    return {
      isVague: true,
      questions: [
        {
          question: "What overall style or medium?",
          why: "Style dominates the look — photo vs illustration vs 3D changes everything.",
          options: ["photorealistic", "flat illustration", "3D render", "watercolor"],
        },
        {
          question: "What mood or color palette?",
          why: "Palette and mood set the emotional read of the image.",
          options: ["warm & vibrant", "cool & calm", "high-contrast", "muted pastels"],
        },
      ],
    };
  }

  async generateCandidates(_prompt: string, count: number): Promise<GeneratedImage[]> {
    // Random base so "try again" yields visibly different placeholders.
    const base = Math.floor(Math.random() * BACKGROUNDS.length);
    return Promise.all(Array.from({ length: count }, (_, i) => placeholder(base + i)));
  }

  async editImage(source: Buffer, _mimeType: string, _instruction: string): Promise<GeneratedImage> {
    // Visibly transform the source so the "edit" is obvious in the UI.
    const data = await sharp(source).modulate({ hue: 45, saturation: 1.15 }).png().toBuffer();
    return { data, mimeType: "image/png", width: SIZE, height: SIZE };
  }
}
