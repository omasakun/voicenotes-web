import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { randomBase32 } from "./utils";

// If there are users, we require an invitation
export async function requiresInvitation() {
  const userCount = await prisma.user.count();
  return userCount > 0;
}

export async function createInvitation({
  inviterId,
  email,
  maxUses = 1,
  expiresInDays = 7,
}: {
  inviterId: string;
  email?: string;
  maxUses?: number;
  expiresInDays?: number;
}) {
  const code = randomBase32(8);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  return await prisma.invitation.create({
    data: {
      code,
      email,
      maxUses,
      expiresAt,
      inviterId,
    },
  });
}

export async function validateInvitation(code: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { code },
    include: { inviter: true },
  });

  if (!invitation) {
    throw new Error("Invalid invitation code");
  }

  if (invitation.expiresAt < new Date()) {
    throw new Error("Invitation has expired");
  }

  if (invitation.usedCount >= invitation.maxUses) {
    throw new Error("Invitation has been fully used");
  }

  return invitation;
}

export async function useInvitation(code: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { code },
    });

    if (!invitation) {
      throw new Error("Invalid invitation code");
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error("Invitation has expired");
    }

    if (invitation.usedCount >= invitation.maxUses) {
      throw new Error("Invitation has been fully used");
    }

    await tx.invitation.update({
      where: { code },
      data: { usedCount: invitation.usedCount + 1 },
    });
  });
}
