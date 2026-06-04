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

You never enter the Claude refinement stage until you're happy with a selected image. In the Claude stage the first pass runs automatically, then you can refine further with feedback or finish.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma 7 / PostgreSQL · tsyringe ·
`@google/genai` · `@anthropic-ai/claude-agent-sdk` · AWS S3 (images) · Docker.

## Architecture

- **State machine** — each project moves through `clarifying → generating → choosing → (gemini_refining)* → claude_refining* → complete`. User actions live in `src/logic/projectService.ts`; engine-result transitions live in `src/logic/jobProcessor.ts`.
- **Async jobs** — every AI call is a `Job` row processed by an in-process runner (`jobProcessor`, started from `src/instrumentation.ts`). The UI polls until the job finishes, so long generations never block a request (important behind App Runner's request timeout).
- **Engines behind interfaces** — `ImageGenerator` (Gemini) and `ImageRefiner` (Claude) are DI'd via tsyringe (`src/container.ts`), so they're easy to mock and swap. The Claude refiner runs the Agent SDK in an isolated scratch dir with `Read`/`Write`/`Bash` and drives sharp/ImageMagick. **GIMP later**: point the system prompt + allowed tools at `gimp -i -b …` — no flow change.
- **Storage** — image bytes in S3 (MinIO locally), metadata in Postgres. Images are served by streaming through `/api/images/[id]`.

## Local development

Requires Docker. Postgres + MinIO + the web app all run via compose.

```bash
cp .env.example .env          # defaults to AI_PROVIDER=fixtures — no API keys needed
docker compose up --build
```

**Provider modes.** `AI_PROVIDER=fixtures` (the dev default) runs the entire
flow offline at **zero cost** — canned clarifying questions plus
sharp-generated placeholder images, with real image transforms on edit/refine so
storage, history, and every UI branch are exercised. Flip to the real engines by
setting `AI_PROVIDER=live` (or removing it) and supplying `GEMINI_API_KEY`
(free-tier covers the clarify step; nano-banana image gen is ~$0.04/image) and
`ANTHROPIC_API_KEY`. Iterate prompts/instructions cheaply in fixtures mode (and
in your own interactive Claude Code session) before switching to live keys.

- App: http://localhost:3000
- MinIO console: http://localhost:9001 (minioadmin / minioadmin)

Or run the app on the host against just the data services:

```bash
docker compose up -d db minio createbucket
npm install
npm run db:migrate:dev        # create the schema
npm run dev
```

Useful scripts: `npm run build`, `npm run lint`, `npm test`, `npm run db:studio`.

## Deploying to AWS (App Runner + RDS + S3)

App Runner runs a **single container image**; Postgres is **RDS** (not in App Runner) and images live in **S3**.

1. **Provision**
   - An **S3 bucket** for images (e.g. `ai-image-gen-prod`).
   - An **RDS PostgreSQL** instance; note its connection string for `DATABASE_URL`/`DIRECT_URL`.
   - An **ECR repository** for the image.

2. **Build & push the image**

   ```bash
   AWS_REGION=us-east-1 ACCOUNT=<your-account-id>
   aws ecr get-login-password --region $AWS_REGION \
     | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com
   docker build -t ai-image-gen .
   docker tag ai-image-gen $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/ai-image-gen:latest
   docker push $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/ai-image-gen:latest
   ```

3. **Create the App Runner service** from that ECR image:
   - Port `3000`, health check path `/api/health`.
   - **Min = Max = 1 instance** for the MVP — the in-process job runner and the Claude scratch dir assume a single instance.
   - **Instance role**: attach an IAM role with `s3:PutObject`/`s3:GetObject` on the bucket. With a role attached, leave `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` **unset** (the SDK uses the role).
   - **Environment** (use App Runner secrets for the keys):
     - `AI_PROVIDER=live` (or omit — only `fixtures` enables the offline mock)
     - `DATABASE_URL`, `DIRECT_URL` → RDS
     - `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
     - `S3_BUCKET`, `S3_REGION` (leave `S3_ENDPOINT` and `S3_FORCE_PATH_STYLE` unset for real S3)
     - optional model overrides: `GEMINI_IMAGE_MODEL`, `GEMINI_TEXT_MODEL`, `CLAUDE_MODEL`

   The container runs `prisma migrate deploy` on start, then `next start`.

## License

MIT © Volare Consulting
