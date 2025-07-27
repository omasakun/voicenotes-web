declare namespace App {
  interface Locals {
    user: import("@/lib/auth").User | null;
    session: import("@/lib/auth").Session | null;
  }
}

interface Window {
  swup: import("swup").Swup;
}
