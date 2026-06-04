# ai-image-gen

A two-engine AI image generation & refinement studio.

You describe what you want; the app turns it into a finished graphic through two complementary AI engines:

- **Google Gemini "nano-banana"** (`gemini-3.1-flash-image`) owns the **creative phase** — refining your prompt, asking high-impact clarifying questions, generating image candidates, and conversational style edits ("make it more cinematic", "warmer palette", "add a mountain").
- **Claude (Agent SDK)** owns the **technical-refinement phase** — sharpness, color, clean lines and shapes. Claude inspects the image and drives deterministic image-editing CLI tools (`sharp` / ImageMagick today, GIMP CLI later) to apply precise transforms.

Everything is organized into **image projects**: every image produced at every step is saved with its lineage, so you can browse the whole journey and step back to any earlier point.

## The flow

```
prompt ─▶ (clarify if vague) ─▶ generate 3 candidates
              ├─ Select as-is ──────────────▶ Claude refinement (auto + feedback loop) ─▶ done
              ├─ Select w/ suggestions ─────▶ Gemini re-edits that one image (loop)
              └─ None, try again ───────────▶ regenerate 3
```

You never enter the Claude refinement stage until you're happy with a selected image.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma 7 / PostgreSQL · tsyringe ·
`@google/genai` · `@anthropic-ai/claude-agent-sdk` · AWS S3 (images) · Docker.

## Getting started

See [`docs/`](docs/) and the local-dev section below once the app is scaffolded.

```bash
cp .env.example .env
docker compose up        # web + postgres + minio (S3-compatible)
```

## Hosting

Designed for **AWS App Runner** (single web container) + **RDS PostgreSQL** + **S3**. See the deployment section of the docs.

## License

MIT © Volare Consulting
