import { join } from "node:path";
import { execa } from "execa";
import type { WhisperVerboseResponse } from "@/types/transcription";

interface FasterWhisperOptions {
  model?: "tiny" | "base" | "small" | "medium" | "large-v2" | "large-v3";
  language?: string;
  device?: "cpu" | "cuda";
  computeType?: "int8" | "float16" | "float32";
}

function getDefaultOptions(): Required<FasterWhisperOptions> {
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

  try {
    const { stdout } = await execa("uv", args, {
      cwd: join(process.cwd(), "python"),
    });

    const result = JSON.parse(stdout);

    if (result.error) {
      throw new Error(result.error);
    }

    return result as WhisperVerboseResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Faster Whisper transcription failed: ${error.message}`);
    }
    throw new Error("Faster Whisper transcription failed with unknown error");
  }
}
