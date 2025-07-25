import { createReadStream, statSync } from "node:fs";
import { join } from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { streamFromNodeStream } from "@/lib/utils-server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Users can only access their own recordings
    const recording = await prisma.audioRecording.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    const filePath = join(process.cwd(), recording.filePath);

    try {
      const stats = statSync(filePath);
      const fileSize = stats.size;

      // Handle Range requests for audio streaming
      const range = request.headers.get("range");

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const stream = streamFromNodeStream(createReadStream(filePath, { start, end }));

        return new NextResponse(stream, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunkSize.toString(),
            "Content-Type": recording.mimeType,
            "Cache-Control": "public, max-age=31536000",
          },
        });
      } else {
        const stream = streamFromNodeStream(createReadStream(filePath));

        return new NextResponse(stream, {
          status: 200,
          headers: {
            "Content-Length": fileSize.toString(),
            "Content-Type": recording.mimeType,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=31536000",
          },
        });
      }
    } catch (fileError) {
      console.error("File access error:", fileError);
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error in audio route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
