import { defineMiddleware } from "astro:middleware";
import { auth } from "@/lib/auth";
import { startup } from "@/lib/startup";

await startup();

export const onRequest = defineMiddleware(async (context, next) => {
  const { url } = context;
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });

  if (session) {
    context.locals.user = session.user;
    context.locals.session = session.session;
  } else {
    context.locals.user = null;
    context.locals.session = null;
  }

  if (["/signup", "/signin"].includes(url.pathname)) {
    if (session) {
      return context.redirect("/recordings");
    }
  }

  const protectedPaths = ["/account", "/dashboard", "/recordings"];
  if (protectedPaths.some((path) => url.pathname.startsWith(path))) {
    if (!session) {
      return context.redirect("/signin");
    }
  }

  return next();
});
