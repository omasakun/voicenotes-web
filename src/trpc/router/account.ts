import { prisma } from "@/lib/prisma";
import { sum } from "@/lib/utils";
import { createTRPCRouter, userProcedure } from "../init";

export const accountRouter = createTRPCRouter({
  stats: userProcedure.query(async ({ ctx }) => {
    const stats = await prisma.audioRecording.groupBy({
      by: ["status"],
      _count: true,
      _sum: {
        fileSize: true,
        duration: true,
      },
      where: { userId: ctx.user.id },
    });

    const totalRecordings = sum(stats.map((stat) => stat._count));
    const completedRecordings = stats.find((stat) => stat.status === "COMPLETED")?._count || 0;
    const processingRecordings = stats.find((stat) => stat.status === "PROCESSING")?._count || 0;
    const failedRecordings = stats.find((stat) => stat.status === "FAILED")?._count || 0;
    const totalSize = sum(stats.map((stat) => stat._sum.fileSize || 0));
    const totalDuration = sum(stats.map((stat) => stat._sum.duration || 0));

    return {
      totalRecordings,
      completedRecordings,
      processingRecordings,
      failedRecordings,
      totalSize,
      totalDuration,
    };
  }),
});
