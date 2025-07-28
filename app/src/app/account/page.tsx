import type { DehydratedState } from "@tanstack/react-query";
import type { User } from "@/lib/auth";
import { AccountDashboard } from "./account-dashboard";
import { AppWrapper } from "@/components/app-wrapper";

export default function AccountPage({ user, dehydratedState }: { user: User; dehydratedState?: DehydratedState }) {
  return (
    <AppWrapper dehydratedState={dehydratedState}>
      <div className="container mx-auto px-4 py-8">
        <AccountDashboard user={user} />
      </div>
    </AppWrapper>
  );
}
