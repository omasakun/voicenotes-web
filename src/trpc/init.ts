import { initTRPC } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";

// https://trpc.io/docs/server/context
export const createTRPCContext = cache(async () => {
  // TODO: add context creation logic here
});

const t = initTRPC.create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
