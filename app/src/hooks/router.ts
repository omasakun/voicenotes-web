import { useEffect, useState } from "react";

export function usePathname(initialPathname: string) {
  const [pathname, setPathname] = useState(initialPathname);

  useEffect(() => {
    setPathname(window.location.pathname);
    const update = () => setPathname(window.location.pathname);

    document.addEventListener("astro:page-load", update);
    return () => document.removeEventListener("astro:page-load", update);
  }, []);

  return pathname;
}
