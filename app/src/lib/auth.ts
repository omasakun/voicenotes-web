import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { redeemInvitation, requiresInvitation, validateInvitation } from "./invitations";
import { prisma } from "./prisma";

export type Session = (typeof auth.$Infer.Session)["session"];
export type User = (typeof auth.$Infer.Session)["user"];
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  appName: "Voicenotes",
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.BASE_URL,
  plugins: [admin()],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {},
  user: {
    additionalFields: {
      inviterId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      // TODO: check if user cannot update inviterId from the client
      create: {
        async before(user, context) {
          // Get invitation code from request body or context
          const invitationCode = context?.body?.invitationCode as string;

          if (!invitationCode) {
            if (!(await requiresInvitation())) {
              return { data: user };
            }

            throw new APIError("BAD_REQUEST", {
              message: "Invitation code is required to create an account",
            });
          }

          // Validate the invitation
          const invitation = await validateInvitation(invitationCode);

          // If invitation is for a specific email, verify it matches
          if (invitation.email && invitation.email !== user.email) {
            throw new APIError("BAD_REQUEST", {
              message: "Invitation code does not match the provided email",
            });
          }

          // Mark invitation as used
          // TODO: use prisma transaction to ensure atomicity
          await redeemInvitation(invitationCode);

          return {
            data: {
              ...user,
              inviterId: invitation.inviterId,
            },
          };
        },
      },
    },
  },
  rateLimit: {
    window: 60,
    max: 100,
    storage: "memory",
  },
});
