import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/lib/auth";

// https://trpc.io/docs/server/context
export const createTRPCContext = async (ctx: { req: Request }) => {
  const session = await auth.api.getSession({
    headers: ctx.req.headers,
  });

  return {
    session: session?.session,
    user: session?.user,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

export const userProcedure = baseProcedure.use(async ({ next, ctx }) => {
  if (!ctx.user) {
    throw new Error("UNAUTHORIZED");
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const adminProcedure = userProcedure.use(async ({ next, ctx }) => {
  if (ctx.user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return next();
});
