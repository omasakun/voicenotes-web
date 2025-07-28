import { UserManagement } from "@/app/dashboard/user-management";
import { VoiceRecordings } from "@/app/dashboard/voice-recordings";
import { AppWrapper } from "@/components/app-wrapper";
import { AllInvitationsCard } from "@/components/invitations";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DehydratedState } from "@tanstack/react-query";

export default function DashboardPage({ dehydratedState }: { dehydratedState?: DehydratedState }) {
  return (
    <AppWrapper dehydratedState={dehydratedState}>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <PageHeader title="Dashboard" description="As an admin, you can manage users and invitations." />

          <Tabs defaultValue="invitations" className="space-y-4">
            <TabsList>
              <TabsTrigger value="invitations">Invitations</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="recordings">Recordings</TabsTrigger>
            </TabsList>

            <TabsContent value="invitations">
              <AllInvitationsCard />
            </TabsContent>

            <TabsContent value="users">
              <UserManagement />
            </TabsContent>

            <TabsContent value="recordings">
              <VoiceRecordings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppWrapper>
  );
}
