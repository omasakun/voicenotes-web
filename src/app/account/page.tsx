import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountDashboard } from "./account-dashboard";

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return redirect("/signin");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <AccountDashboard user={session.user} />
    </div>
  );
}
