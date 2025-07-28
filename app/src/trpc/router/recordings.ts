import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { transcriptionQueue } from "@/lib/transcription";
import { adminProcedure, createTRPCRouter, userProcedure } from "../init";

export const recordingsRouter = createTRPCRouter({
  list: userProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, search } = input;

      // TODO: https://www.prisma.io/docs/orm/prisma-client/queries/full-text-search
      const recordings = await prisma.audioRecording.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          userId: ctx.user.id,
          ...(search && {
            OR: [
              { title: { contains: search } },
              { originalName: { contains: search } },
              { transcription: { contains: search } },
            ],
          }),
        },
        omit: {
          transcription: true,
          whisperData: true,
        },
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined;
      if (recordings.length > limit) {
        const nextItem = recordings.pop();
        nextCursor = nextItem!.id;
      }

      return {
        recordings,
        nextCursor,
      };
    }),

  get: userProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const recording = await prisma.audioRecording.findFirst({
      where: {
        id: input.id,
        userId: ctx.user.id,
      },
    });

    if (!recording) {
      throw new Error("Recording not found");
    }

    return recording;
  }),

  delete: userProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const recording = await prisma.audioRecording.findFirst({
      where: {
        id: input.id,
        userId: ctx.user.id,
      },
    });

    if (!recording) {
      throw new Error("Recording not found");
    }

    // TODO: Delete file from disk
    // const filePath = join(process.cwd(), recording.filePath);
    // await unlink(filePath).catch(() => {}); // Ignore errors

    return await prisma.audioRecording.delete({
      where: { id: input.id },
    });
  }),

  updateTitle: userProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await prisma.audioRecording.update({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
        data: {
          title: input.title,
        },
      });
    }),

  listAll: adminProcedure.query(async () => {
    return await prisma.audioRecording.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      omit: {
        transcription: true,
        whisperData: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  reschedule: adminProcedure
    .input(
      z.object({
        recordingId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const recording = await prisma.audioRecording.findUnique({
        where: { id: input.recordingId },
      });

      if (!recording) {
        throw new Error("Recording not found");
      }

      // if (recording.status === "PROCESSING") {
      //   throw new Error("Cannot reschedule a recording that is processing");
      // }

      // Update status to PENDING and clear error message
      await prisma.audioRecording.update({
        where: { id: input.recordingId },
        data: {
          status: "PENDING",
          transcriptionError: null,
        },
      });

      // Update transcription queue
      await transcriptionQueue.updateQueue();

      return { success: true };
    }),

  rescheduleAllFailed: adminProcedure.mutation(async () => {
    const failedRecordings = await prisma.audioRecording.updateMany({
      where: { status: "FAILED" },
      data: {
        status: "PENDING",
        transcriptionError: null,
      },
    });

    // Update transcription queue
    await transcriptionQueue.updateQueue();

    return failedRecordings.count;
  }),
});
