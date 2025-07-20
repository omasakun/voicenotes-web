import { createReadStream } from "node:fs";
import { join } from "node:path";
import { execa } from "execa";
import { OpenAI } from "openai";
import { prisma } from "./prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TranscriptionJob {
  recordingId: string;
  filePath: string;
}

class TranscriptionQueue {
  private queue: TranscriptionJob[] = [];
  private processing = false;

  async add(job: TranscriptionJob) {
    this.queue.push(job);
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const job = this.queue.shift()!;

    try {
      await this.processRecording(job);
    } catch (error) {
      console.error(`Failed to process recording ${job.recordingId}:`, error);
    }

    // Process next job after current task
    setTimeout(() => this.processQueue(), 0);
  }

  private async processRecording(job: TranscriptionJob) {
    console.log(`Starting transcription for recording ${job.recordingId}`);

    try {
      // Update status to processing
      await prisma.audioRecording.update({
        where: { id: job.recordingId },
        data: {
          status: "PROCESSING",
          transcriptionProgress: 10,
        },
      });

      // Get audio duration using ffmpeg
      const duration = await this.getAudioDuration(job.filePath);

      // Update duration in database
      await prisma.audioRecording.update({
        where: { id: job.recordingId },
        data: { duration, transcriptionProgress: 20 },
      });

      // Convert to supported format if needed (OpenAI supports mp3, mp4, mpeg, mpga, m4a, wav, webm)
      const processedFilePath = await this.preprocessAudio(job.filePath);

      // Update progress
      await prisma.audioRecording.update({
        where: { id: job.recordingId },
        data: { transcriptionProgress: 30 },
      });

      // Transcribe using OpenAI Whisper
      const transcription = await this.transcribeWithOpenAI(processedFilePath);

      // Save transcription to database
      await prisma.audioRecording.update({
        where: { id: job.recordingId },
        data: {
          transcription,
          status: "COMPLETED",
          transcriptionProgress: 100,
          transcriptionError: null,
        },
      });

      console.log(`Transcription completed for recording ${job.recordingId}`);
    } catch (error) {
      console.error(`Transcription failed for recording ${job.recordingId}:`, error);

      await prisma.audioRecording.update({
        where: { id: job.recordingId },
        data: {
          status: "FAILED",
          transcriptionError: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  private async getAudioDuration(filePath: string): Promise<number> {
    try {
      const fullPath = join(process.cwd(), filePath);
      const { stdout } = await execa("ffmpeg", ["-i", fullPath, "-f", "null", "-"], {
        stderr: "pipe",
        reject: false,
      });

      // Parse duration from ffmpeg output
      const durationMatch = stdout.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1]);
        const minutes = parseInt(durationMatch[2]);
        const seconds = parseFloat(durationMatch[3]);
        return hours * 3600 + minutes * 60 + seconds;
      }

      return 0;
    } catch (error) {
      console.error("Failed to get audio duration:", error);
      return 0;
    }
  }

  private async preprocessAudio(filePath: string): Promise<string> {
    // For now, just return the original path
    // In the future, we could convert unsupported formats to mp3
    return filePath;
  }

  private async transcribeWithOpenAI(filePath: string): Promise<string> {
    const fullPath = join(process.cwd(), filePath);

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(fullPath),
        model: "whisper-1",
        language: "ja", // You can make this configurable
        response_format: "text",
      });

      return transcription;
    } catch (error) {
      console.error("OpenAI transcription error:", error);
      throw new Error(`${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

// Create singleton instance
export const transcriptionQueue = new TranscriptionQueue();

// Helper function to add recordings to the queue
export async function queueTranscription(recordingId: string) {
  const recording = await prisma.audioRecording.findUnique({
    where: { id: recordingId },
  });

  if (!recording) {
    throw new Error("Recording not found");
  }

  await transcriptionQueue.add({
    recordingId: recording.id,
    filePath: recording.filePath,
  });
}
