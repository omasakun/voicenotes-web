-- CreateTable
CREATE TABLE "audio_recording" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "duration" REAL,
    "mimeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transcription" TEXT,
    "transcriptionProgress" REAL NOT NULL DEFAULT 0,
    "transcriptionError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "audio_recording_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "audio_recording_userId_createdAt_idx" ON "audio_recording"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audio_recording_status_idx" ON "audio_recording"("status");
