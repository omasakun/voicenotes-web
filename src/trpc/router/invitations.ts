import { z } from "zod";
import { createInvitation, validateInvitation } from "@/lib/invitations";
import { prisma } from "@/lib/prisma";
import { adminProcedure, baseProcedure, createTRPCRouter, userProcedure } from "../init";

export const invitationsRouter = createTRPCRouter({
  create: userProcedure
    .input(
      z.object({
        email: z.email().optional(),
        maxUses: z.number().min(1).max(100).default(1),
        expiresInDays: z.number().min(1).max(365).default(7),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await createInvitation({
        ...input,
        inviterId: ctx.user.id,
      });
    }),

  list: userProcedure.query(async ({ ctx }) => {
    return await prisma.invitation.findMany({
      where: { inviterId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  listAll: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { limit, cursor } = input;

      const invitations = await prisma.invitation.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        include: {
          inviter: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined;
      if (invitations.length > limit) {
        const nextItem = invitations.pop();
        nextCursor = nextItem!.id;
      }

      return {
        invitations,
        nextCursor,
      };
    }),

  delete: userProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    // Users can only delete their own invitations, admins can delete any
    const where = ctx.user.role === "admin" ? { id: input.id } : { id: input.id, inviterId: ctx.user.id };

    return await prisma.invitation.delete({
      where,
    });
  }),

  validate: baseProcedure.input(z.object({ code: z.string() })).query(async ({ input }) => {
    try {
      const invitation = await validateInvitation(input.code);
      return {
        valid: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          inviterName: invitation.inviter.name,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid invitation",
      };
    }
  }),
});
