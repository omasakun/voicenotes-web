import { createTRPCRouter } from "./init";
import { accountRouter } from "./router/account";
import { invitationsRouter } from "./router/invitations";
import { recordingsRouter } from "./router/recordings";

export type AppRouter = typeof appRouter;
export const appRouter = createTRPCRouter({
  account: accountRouter,
  recordings: recordingsRouter,
  invitations: invitationsRouter,
});
