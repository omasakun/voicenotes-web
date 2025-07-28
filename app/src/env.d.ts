declare namespace App {
  interface Locals {
    user: import("@/lib/auth").User | null;
    session: import("@/lib/auth").Session | null;
    queryClient?: import("@tanstack/react-query").QueryClient;
    trpcContext?: import("@/trpc/init").Context;
    trpc?: import("@/trpc/server").AstroTRPC;
  }
}
