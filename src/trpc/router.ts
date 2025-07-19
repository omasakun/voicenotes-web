import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "./init";

export type AppRouter = typeof appRouter;
export const appRouter = createTRPCRouter({
  hello: baseProcedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .query((opts) => {
      return {
        greeting: `hello ${opts.input.text}`,
      };
    }),
});
