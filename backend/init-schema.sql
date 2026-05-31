-- IntelliDocs Database Schema
-- Generated from Prisma schema

-- User table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT DEFAULT 'user' NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- Document table
CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "ocrApplied" BOOLEAN DEFAULT false NOT NULL,
    "ocrLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isDeleted" BOOLEAN DEFAULT false NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Document_userId_idx" ON "Document"("userId");
CREATE INDEX IF NOT EXISTS "Document_createdAt_idx" ON "Document"("createdAt");

-- DocumentCollection table
CREATE TABLE IF NOT EXISTS "DocumentCollection" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "DocumentCollection_userId_idx" ON "DocumentCollection"("userId");

-- CollectionDocument join table
CREATE TABLE IF NOT EXISTS "CollectionDocument" (
    "id" TEXT PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY ("collectionId") REFERENCES "DocumentCollection"("id") ON DELETE CASCADE,
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE,
    UNIQUE("collectionId", "documentId")
);

-- Embedding table
CREATE TABLE IF NOT EXISTS "Embedding" (
    "id" TEXT PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "chunkText" TEXT NOT NULL,
    "vectorId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "chunkSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Embedding_documentId_idx" ON "Embedding"("documentId");
CREATE INDEX IF NOT EXISTS "Embedding_vectorId_idx" ON "Embedding"("vectorId");

-- Chat table
CREATE TABLE IF NOT EXISTS "Chat" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "documentId" TEXT,
    "collectionId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sourceCitations" JSONB NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL,
    FOREIGN KEY ("collectionId") REFERENCES "DocumentCollection"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "Chat_userId_idx" ON "Chat"("userId");
CREATE INDEX IF NOT EXISTS "Chat_documentId_idx" ON "Chat"("documentId");
CREATE INDEX IF NOT EXISTS "Chat_collectionId_idx" ON "Chat"("collectionId");
CREATE INDEX IF NOT EXISTS "Chat_createdAt_idx" ON "Chat"("createdAt");

-- OCRResult table
CREATE TABLE IF NOT EXISTS "OCRResult" (
    "id" TEXT PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "rawText" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "cerScore" DOUBLE PRECISION,
    "werScore" DOUBLE PRECISION,
    "tesseractConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "OCRResult_documentId_idx" ON "OCRResult"("documentId");
CREATE INDEX IF NOT EXISTS "OCRResult_pageNumber_idx" ON "OCRResult"("pageNumber");
CREATE INDEX IF NOT EXISTS "OCRResult_language_idx" ON "OCRResult"("language");

-- DetectionResult table
CREATE TABLE IF NOT EXISTS "DetectionResult" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "textHash" TEXT UNIQUE NOT NULL,
    "aiProbability" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,
    "perplexityScore" DOUBLE PRECISION,
    "burstnessScore" DOUBLE PRECISION,
    "highlightedSentences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "DetectionResult_userId_idx" ON "DetectionResult"("userId");
CREATE INDEX IF NOT EXISTS "DetectionResult_createdAt_idx" ON "DetectionResult"("createdAt");

-- Subscription table
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT UNIQUE NOT NULL,
    "plan" TEXT NOT NULL,
    "stripeId" TEXT,
    "startDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");
