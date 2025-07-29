import { createReadStream } from "node:fs";
import { join } from "node:path";
import { execa } from "execa";
import { OpenAI } from "openai";
import type { WhisperVerboseResponse } from "@/types/transcription";
import { transcribeWithFasterWhisper } from "./faster-whisper";
import { processTranscription } from "./transcription-revise";
import { prisma } from "./prisma";
import { changeExtension } from "./utils-server";

const PROGRESS_DEBOUNCE_MS = 500;

interface TranscriptionJob {
  recordingId: string;
  filePath: string;
}

class TranscriptionQueue {
  private queue: TranscriptionJob[] = [];
  private processing = false;
  private initialized = false;
  private openai: OpenAI | null = null;

  add(job: TranscriptionJob) {
    this.queue.push(job);
    if (!this.processing) {
      this.processQueue();
    }
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // TODO: Reset PROCESSING status to PENDING for interrupted recordings
      // const { count: numProcessing } = await prisma.audioRecording.updateMany({
      //   where: {
      //     status: "PROCESSING",
      //   },
      //   data: {
      //     status: "PENDING",
      //     transcriptionProgress: 0,
      //   },
      // });
      const numProcessing = 0;

      // Find all recordings that need processing
      const numQueued = await this.updateQueue();

      this.initialized = true;
      console.log(
        `Transcription queue initialized. (reset ${numProcessing} interrupted jobs, queued ${numQueued} jobs)`,
      );
    } catch (error) {
      console.error("Failed to initialize transcription queue:", error);
    }
  }

  async updateQueue() {
    const pendingRecordings = await prisma.audioRecording.findMany({
      where: {
        status: "PENDING",
      },
      select: {
        id: true,
        filePath: true,
      },
    });

    // Add them to the queue
    let queuedCount = 0;
    for (const recording of pendingRecordings) {
      if (!this.queue.some((job) => job.recordingId === recording.id)) {
        queuedCount++;
        this.add({
          recordingId: recording.id,
          filePath: recording.filePath,
        });
      }
    }
    return queuedCount;
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
          revisedSegments: null,
          status: "PROCESSING",
          transcriptionProgress: 1,
          transcriptionError: null,
        },
      });

      // Convert audio to 16kHz OGG
      const convertedFilePath = await this.convertTo16kHzOgg(job.filePath);

      let lastProgressUpdate = 0;

      // Transcribe using faster-whisper
      const partialResult: Required<WhisperVerboseResponse> = {
        duration: 0,
        language: "",
        text: "",
        segments: [],
        words: [],
      };

      const fullPath = join(process.cwd(), convertedFilePath);
      const whisperResponse = await transcribeWithFasterWhisper(fullPath, {
        initialPrompt: "こんにちは。天気、晴れていますね！うまくいくと良いですねー。",
        async onProgress(progress) {
          const now = Date.now();
          if (now - lastProgressUpdate >= PROGRESS_DEBOUNCE_MS || progress >= 100) {
            lastProgressUpdate = now;
            try {
              await prisma.audioRecording.update({
                where: { id: job.recordingId },
                data: { transcriptionProgress: progress * 0.94 + 1 }, // 1% ~ 95% for processing
              });
            } catch (error) {
              console.error(`Failed to update progress for recording ${job.recordingId}:`, error);
            }
          }
        },
        async onInfo(info) {
          partialResult.duration = info.duration;
          partialResult.language = info.language;

          // update duration entry
          try {
            await prisma.audioRecording.update({
              where: { id: job.recordingId },
              data: { duration: info.duration },
            });
          } catch (error) {
            console.error(`Failed to update duration for recording ${job.recordingId}:`, error);
          }
        },
        async onDelta(delta) {
          partialResult.segments.push(delta.segment);
          partialResult.words.push(...(delta.words || []));
          partialResult.text = partialResult.segments.map((s) => s.text).join(" ");

          try {
            await prisma.audioRecording.update({
              where: { id: job.recordingId },
              data: {
                transcription: partialResult.text,
                whisperData: JSON.stringify(partialResult),
              },
            });
          } catch (error) {
            console.error(`Failed to update partial result for recording ${job.recordingId}:`, error);
          }
        },
      });

      await prisma.audioRecording.update({
        where: { id: job.recordingId },
        data: {
          transcription: whisperResponse.text,
          whisperData: JSON.stringify(whisperResponse),
        },
      });

      let revisedSegments = null;
      if (whisperResponse.words && whisperResponse.words.length > 0) {
        try {
          const processedSegments = await processTranscription(whisperResponse.text, whisperResponse.words);
          revisedSegments = JSON.stringify(processedSegments);
        } catch (error) {
          console.error(`ChatGPT processing failed for recording ${job.recordingId}:`, error);
          // Continue without revised segments
        }
      }

      // Save final transcription to database
      await prisma.audioRecording.update({
        where: { id: job.recordingId },
        data: {
          duration: whisperResponse.duration,
          transcription: whisperResponse.text,
          whisperData: JSON.stringify(whisperResponse),
          revisedSegments,
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

  private async convertTo16kHzOgg(filePath: string): Promise<string> {
    const fullPath = join(process.cwd(), filePath);
    const outputFilePath = changeExtension(filePath, ".16kHz.ogg");
    const outputFullPath = join(process.cwd(), outputFilePath);

    const { failed, stderr } = await execa({
      reject: false,
    })`ffmpeg -y -i ${fullPath} -ar 16000 -ac 1 -c:a libvorbis ${outputFullPath}`;

    if (failed) {
      console.error(`Failed to convert audio to 16kHz OGG: ${stderr}`);
      throw new Error("Audio conversion failed");
    }

    return outputFilePath;
  }

  private async getAudioDuration(filePath: string): Promise<number> {
    try {
      const fullPath = join(process.cwd(), filePath);
      const { stdout } = await execa("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        fullPath,
      ]);

      const duration = parseFloat(stdout);
      if (!Number.isNaN(duration)) {
        return duration;
      }

      return 0;
    } catch (error) {
      console.error("Failed to get audio duration:", error);
      return 0;
    }
  }

  private async transcribeWithOpenAI(filePath: string): Promise<WhisperVerboseResponse> {
    const fullPath = join(process.cwd(), filePath);

    const openai =
      this.openai ||
      new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

    this.openai = openai;

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(fullPath),
        model: "whisper-1",
        language: "ja", // TODO: make this configurable
        response_format: "verbose_json",
        timestamp_granularities: ["word"],
      });

      return transcription as WhisperVerboseResponse;
    } catch (error) {
      console.error("OpenAI transcription error:", error);
      throw new Error(`${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

// Create singleton instance
export const transcriptionQueue = new TranscriptionQueue();

// Helper function to initialize the transcription queue
export async function initializeTranscriptionQueue() {
  return transcriptionQueue.initialize();
}

// Helper function to add recordings to the queue
export async function queueTranscription(recordingId: string) {
  const recording = await prisma.audioRecording.findUnique({
    where: { id: recordingId },
  });

  if (!recording) {
    throw new Error("Recording not found");
  }

  transcriptionQueue.add({
    recordingId: recording.id,
    filePath: recording.filePath,
  });
}
