-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "shapeAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transparentBgAvailable" BOOLEAN NOT NULL DEFAULT false;
