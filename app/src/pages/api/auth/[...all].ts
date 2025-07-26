import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";

export const ALL: APIRoute = async ({ request, clientAddress }) => {
  // If you want to use rate limiting, make sure to set the 'x-forwarded-for' header to the request headers from the context
  request.headers.set("x-forwarded-for", clientAddress);
  return auth.handler(request);
};
