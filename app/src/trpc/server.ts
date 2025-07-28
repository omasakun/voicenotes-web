import { createTRPCContext } from "@/trpc/init";
import { makeQueryClient } from "@/trpc/query-client";
import { appRouter, type AppRouter } from "@/trpc/router";
import { dehydrate } from "@tanstack/react-query";
import { createTRPCOptionsProxy, type TRPCOptionsProxy, type TRPCQueryOptions } from "@trpc/tanstack-react-query";
import type { AstroGlobal } from "astro";

export type AstroTRPC = TRPCOptionsProxy<AppRouter>;

export function getQueryClient(astro: AstroGlobal) {
  astro.locals.queryClient ??= makeQueryClient();
  return astro.locals.queryClient;
}

async function getTRPCContext(astro: AstroGlobal) {
  astro.locals.trpcContext ??= await createTRPCContext({ req: astro.request });
  return astro.locals.trpcContext;
}

export async function getTRPC(astro: AstroGlobal): Promise<AstroTRPC> {
  if (astro.locals.trpc) return astro.locals.trpc;

  const queryClient = getQueryClient(astro);
  const context = await getTRPCContext(astro);
  const trpc = createTRPCOptionsProxy({
    router: appRouter,
    ctx: context,
    queryClient,
  });

  astro.locals.trpc = trpc;
  return trpc;
}

/** Directly calls the TRPC router without using the query client and caching */
export async function getTRPCCaller(astro: AstroGlobal) {
  const context = await getTRPCContext(astro);
  return appRouter.createCaller(context);
}

// https://trpc.io/docs/client/tanstack-react-query/server-components
export async function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(astro: AstroGlobal, queryOptions: T) {
  const queryClient = getQueryClient(astro);
  if (queryOptions.queryKey[1]?.type === "infinite") {
    await queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    await queryClient.prefetchQuery(queryOptions);
  }
}

export function getDehydratedState(astro: AstroGlobal) {
  return dehydrate(getQueryClient(astro));
}
