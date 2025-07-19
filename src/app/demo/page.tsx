import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { ClientGreeting } from "./client-greeting";

export default async function Home() {
  // prefetch(
  //   trpc.hello.queryOptions({
  //     text: "world",
  //   }),
  // );
  return (
    <HydrateClient>
      <ClientGreeting />
    </HydrateClient>
  );
}
