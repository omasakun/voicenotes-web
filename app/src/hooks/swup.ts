import { useEffect, useState } from "react";
import type { Visit } from "swup";

export function usePathname(initialPathname: string) {
  const [pathname, setPathname] = useState(initialPathname);

  useEffect(() => {
    const handleLocationChange = (visit: Visit) => {
      setPathname(visit.to.url);
    };

    window.swup.hooks.on("page:view", handleLocationChange);

    return () => {
      window.swup.hooks.off("page:view", handleLocationChange);
    };
  }, []);

  return pathname;
}
