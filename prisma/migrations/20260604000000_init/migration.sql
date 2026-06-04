-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('drafting_prompt', 'clarifying', 'generating', 'choosing', 'gemini_refining', 'claude_refining', 'complete', 'error');

-- CreateEnum
CREATE TYPE "ImageStage" AS ENUM ('candidate', 'gemini_refine', 'claude_refine');

-- CreateEnum
CREATE TYPE "ImageEngine" AS ENUM ('gemini', 'claude');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('clarify', 'generate', 'gemini_edit', 'claude_refine');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'done', 'error');

-- CreateEnum
CREATE TYPE "GateKind" AS ENUM ('clarify', 'choose', 'gemini_refine', 'claude_refine');

-- CreateEnum
CREATE TYPE "GateStatus" AS ENUM ('pending', 'resolved');

-- CreateTable
CREATE TABLE "Gate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "GateKind" NOT NULL,
    "summary" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "feedbackHistory" JSONB NOT NULL DEFAULT '[]',
    "status" "GateStatus" NOT NULL DEFAULT 'pending',
    "resolutionPayload" JSONB,
    "resolvedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/png',
    "width" INTEGER,
    "height" INTEGER,
    "stage" "ImageStage" NOT NULL,
    "engine" "ImageEngine" NOT NULL,
    "promptOrInstruction" TEXT NOT NULL,
    "parentImageId" TEXT,
    "candidateGroupId" TEXT,
    "roundIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "resultImageIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMPTZ(6),
    "finishedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalPrompt" TEXT NOT NULL,
    "refinedPrompt" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'drafting_prompt',
    "selectedImageId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Gate_projectId_status_idx" ON "Gate"("projectId", "status");

-- CreateIndex
CREATE INDEX "Image_projectId_createdAt_idx" ON "Image"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Image_candidateGroupId_idx" ON "Image"("candidateGroupId");

-- CreateIndex
CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Job_projectId_createdAt_idx" ON "Job"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- AddForeignKey
ALTER TABLE "Gate" ADD CONSTRAINT "Gate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_parentImageId_fkey" FOREIGN KEY ("parentImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

