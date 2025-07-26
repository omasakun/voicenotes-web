import type React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/client";

interface AppWrapperProps {
  children: React.ReactNode;
}

export function AppWrapper({ children }: AppWrapperProps) {
  return (
    <TRPCReactProvider>
      <main className="min-h-screen">{children}</main>
      <Toaster />
    </TRPCReactProvider>
  );
}
