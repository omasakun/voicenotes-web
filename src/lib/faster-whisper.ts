import { join } from "node:path";
import { execa } from "execa";
import type { WhisperVerboseResponse } from "@/types/transcription";
import { parseJSONLStream } from "./utils-server";

interface FasterWhisperOptions {
  model?: "tiny" | "base" | "small" | "medium" | "large-v2" | "large-v3";
  language?: string;
  device?: "cpu" | "cuda";
  computeType?: "int8" | "float16" | "float32";
  onProgress?: (progress: number, message?: string) => void;
}

interface ProgressEvent {
  type: "status" | "progress" | "info" | "result" | "error";
  timestamp: number;
  message?: string;
  progress?: number;
  duration?: number;
  language?: string;
  error?: string;
  data?: WhisperVerboseResponse;
}

function getDefaultOptions(): Required<Omit<FasterWhisperOptions, "onProgress">> {
  return {
    model: (process.env.WHISPER_MODEL as FasterWhisperOptions["model"]) || "base",
    language: process.env.WHISPER_LANGUAGE || "ja",
    device: (process.env.WHISPER_DEVICE as FasterWhisperOptions["device"]) || "cpu",
    computeType: (process.env.WHISPER_COMPUTE_TYPE as FasterWhisperOptions["computeType"]) || "int8",
  };
}

export async function transcribeWithFasterWhisper(
  audioPath: string,
  options: FasterWhisperOptions = {},
): Promise<WhisperVerboseResponse> {
  const defaults = getDefaultOptions();
  const {
    model = defaults.model,
    language = defaults.language,
    device = defaults.device,
    computeType = defaults.computeType,
    onProgress,
  } = options;

  const pythonScriptPath = join(process.cwd(), "python", "transcribe.py");
  const fullAudioPath = join(process.cwd(), audioPath);

  const args = [
    "run",
    "python",
    pythonScriptPath,
    fullAudioPath,
    "--model",
    model,
    "--device",
    device,
    "--compute-type",
    computeType,
  ];

  if (language) {
    args.push("--language", language);
  }

  if (onProgress) {
    args.push("--progress");
  }

  try {
    if (onProgress) {
      const subprocess = execa("uv", args, {
        cwd: join(process.cwd(), "python"),
        buffer: false,
      });

      let result: WhisperVerboseResponse | null = null;
      let errorResult: string | null = null;

      if (subprocess.stdout) {
        for await (const event of parseJSONLStream<ProgressEvent>(subprocess.stdout)) {
          switch (event.type) {
            case "status":
            case "progress":
              if (event.progress !== undefined) {
                onProgress(event.progress, event.message);
              }
              break;
            case "result":
              result = event.data!;
              break;
            case "error":
              errorResult = event.error || "Unknown error";
              break;
          }
        }
      }

      await subprocess;

      if (errorResult) {
        throw new Error(errorResult);
      }

      if (!result) {
        throw new Error("No result received from transcription");
      }

      return result;
    } else {
      const { stdout } = await execa("uv", args, {
        cwd: join(process.cwd(), "python"),
      });

      const result = JSON.parse(stdout);

      if (result.error) {
        throw new Error(result.error);
      }

      return result as WhisperVerboseResponse;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Faster Whisper transcription failed: ${error.message}`);
    }
    throw new Error("Faster Whisper transcription failed with unknown error");
  }
}
