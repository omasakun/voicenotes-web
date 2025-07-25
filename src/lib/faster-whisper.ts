import { openAsBlob } from "node:fs";
import type { WhisperDelta, WhisperInfo, WhisperVerboseResponse } from "@/types/transcription";
import { parseSseResponse } from "./utils-server";

const SERVER_URL = process.env.WHISPER_SERVER_URL;
const WHISPER_USE_UPLOAD = process.env.WHISPER_USE_UPLOAD === "true";
const WHISPER_PASSWORD = process.env.WHISPER_PASSWORD;

interface FasterWhisperServerOptions {
  language?: string;
  initialPrompt?: string;
  onInfo?: (info: WhisperInfo) => void;
  onProgress?: (progress: number, message?: string) => void;
  onDelta?: (partialResult: WhisperDelta) => void;
}

export async function transcribeWithFasterWhisper(
  audioPath: string,
  options: Omit<FasterWhisperServerOptions, "useUploadEndpoint"> = {},
): Promise<WhisperVerboseResponse> {
  const { language, initialPrompt, onInfo, onProgress, onDelta } = options;

  const controller = new AbortController();
  let response: Response;

  const authHeader = { Authorization: `Basic ${Buffer.from(`user:${WHISPER_PASSWORD}`).toString("base64")}` };

  if (WHISPER_USE_UPLOAD) {
    const endpoint = new URL("/transcribe-upload", SERVER_URL);
    const formData = new FormData();
    const audioFile = await openAsBlob(audioPath);
    formData.append("audio", audioFile);
    if (language) formData.append("language", language);
    if (initialPrompt) formData.append("initial_prompt", initialPrompt);

    response = await fetch(endpoint, {
      method: "POST",
      headers: authHeader,
      body: formData,
      signal: controller.signal,
    });
  } else {
    const endpoint = new URL("/transcribe", SERVER_URL);
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({ audio_path: audioPath, language, initial_prompt: initialPrompt }),
      signal: controller.signal,
    });
  }

  if (!response.ok || !response.body) {
    throw new Error(`Whisper server error: ${response.status} ${response.statusText}`);
  }

  let result: WhisperVerboseResponse | null = null;
  let errorResult: string | null = null;

  for await (const { event, data } of parseSseResponse(response)) {
    if (event !== "message") continue;
    try {
      const parsed = JSON.parse(data);
      switch (parsed.type) {
        case "info":
          onInfo?.({ language: parsed.language, duration: parsed.duration });
          break;
        case "status":
        case "progress":
          onProgress?.(parsed.progress, parsed.message);
          break;
        case "delta":
          onDelta?.(parsed.data);
          break;
        case "result":
          result = parsed.data;
          break;
        case "error":
          errorResult = parsed.error || "Unknown error";
          break;
      }
    } catch {
      console.warn("Failed to parse SSE data", data);
    }
  }

  if (errorResult) {
    throw new Error(errorResult);
  }
  if (!result) {
    throw new Error("No result received from transcription server");
  }
  return result;
}
