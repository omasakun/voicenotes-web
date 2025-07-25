import type { WhisperDelta, WhisperInfo, WhisperVerboseResponse } from "@/types/transcription";
import { parseSseResponse } from "./utils-server";

const SERVER_URL = process.env.WHISPER_SERVER_URL;

interface FasterWhisperServerOptions {
  language?: string;
  onInfo?: (info: WhisperInfo) => void;
  onProgress?: (progress: number, message?: string) => void;
  onDelta?: (partialResult: WhisperDelta) => void;
}

export async function transcribeWithFasterWhisper(
  audioPath: string,
  options: FasterWhisperServerOptions = {},
): Promise<WhisperVerboseResponse> {
  const { language, onInfo, onProgress, onDelta } = options;

  const endpoint = new URL("/process", SERVER_URL);

  const body = {
    audio_path: audioPath,
    language,
  };

  const controller = new AbortController();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });

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
