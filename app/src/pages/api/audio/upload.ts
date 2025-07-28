import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createId } from "@paralleldrive/cuid2";
import type { APIRoute } from "astro";
import z from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { queueTranscription } from "@/lib/transcription";
import { JsonResponse, parseFormData } from "@/lib/utils-server";

const allowedExtensions = ["mp3", "wav", "m4a", "mp4", "webm", "ogg"];

const fieldsSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fields: Record<string, string> = {};
    let audioFile: { originalName: string; fileSize: number; filePath: string; mimeType: string } | undefined;

    for await (const field of parseFormData(request)) {
      if (field.type === "field") {
        fields[field.name] = field.value;
      } else if (field.type === "file") {
        if (field.name !== "audio") {
          return JsonResponse({ error: "Invalid field name" }, 400);
        }

        if (audioFile) {
          return JsonResponse({ error: "Multiple audio files are not allowed" }, 400);
        }

        // Check file extension
        const originalName = field.filename;
        const fileExtension = originalName.split(".").pop()?.toLowerCase() || "";
        if (!allowedExtensions.includes(fileExtension)) {
          return JsonResponse({ error: `Invalid file type. Supported formats: ${allowedExtensions.join(", ")}` }, 400);
        }

        // Generate unique file ID and path
        const fileId = createId();
        const fileName = `${fileId}.${fileExtension}`;

        const relativePath = `uploads/${session.user.id}/${fileName}`;
        const filePath = join(process.cwd(), relativePath);
        await mkdir(dirname(filePath), { recursive: true });

        // Write file to disk using streaming
        await writeFile(filePath, field.file);

        const fileSize = await stat(filePath).then((stats) => stats.size);

        if (fileSize === 0) {
          return JsonResponse({ error: "Audio file is empty" }, 400);
        }

        audioFile = {
          originalName,
          fileSize,
          filePath: relativePath,
          mimeType: field.mimeType,
        };
      }
    }

    if (!audioFile) {
      return JsonResponse({ error: "No audio file provided" }, 400);
    }

    const parsedFields = fieldsSchema.safeParse(fields);
    if (!parsedFields.success) {
      return JsonResponse({ error: "Invalid fields", details: parsedFields.error }, 400);
    }

    // Save to database
    const audioRecording = await prisma.audioRecording.create({
      data: {
        userId: session.user.id,
        title: parsedFields.data.title,
        ...audioFile,
      },
    });

    // Queue for transcription
    try {
      await queueTranscription(audioRecording.id);
    } catch (error) {
      console.error("Failed to queue transcription:", error);
      // Don't fail the upload if transcription queueing fails
      // TODO: what to do here?
    }

    return JsonResponse({
      id: audioRecording.id,
      message: "Audio uploaded successfully",
      status: "pending",
    });
  } catch (error) {
    console.error("Audio upload error:", error);
    return JsonResponse({ error: "Internal server error" }, 500);
  }
};
