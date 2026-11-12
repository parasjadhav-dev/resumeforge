-- CreateTable
CREATE TABLE "JobAnalysisCache" (
    "hash" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "analysis" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobAnalysisCache_pkey" PRIMARY KEY ("hash")
);
