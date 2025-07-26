import { AppWrapper } from "@/components/app-wrapper";
import type { User } from "@/lib/auth";
import { AccountDashboard } from "./account-dashboard";

export default function AccountPage({ user }: { user: User }) {
  return (
    <AppWrapper>
      <div className="container mx-auto px-4 py-8">
        <AccountDashboard user={user} />
      </div>
    </AppWrapper>
  );
}
