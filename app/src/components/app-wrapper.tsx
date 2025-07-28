import type { DehydratedState } from "@tanstack/react-query";
import { HydrationBoundary } from "@tanstack/react-query";
import type React from "react";
import { TRPCReactProvider } from "@/trpc/client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

interface AppWrapperProps {
  children: React.ReactNode;
  dehydratedState?: DehydratedState;
}

export function AppWrapper({ children, dehydratedState }: AppWrapperProps) {
  // TODO: The current DevTools display (and dehydration?) does not work well when there are multiple astro islands.
  return (
    <TRPCReactProvider>
      <HydrationBoundary state={dehydratedState}>
        <main className="min-h-screen">{children}</main>
      </HydrationBoundary>
      <ReactQueryDevtools initialIsOpen={false} />
    </TRPCReactProvider>
  );
}
