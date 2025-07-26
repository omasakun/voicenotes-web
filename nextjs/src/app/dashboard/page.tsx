import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserManagement } from "@/app/dashboard/user-management";
import { VoiceRecordings } from "@/app/dashboard/voice-recordings";
import { AllInvitationsCard } from "@/components/invitations";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.role !== "admin") {
    return redirect("/signin");
  }

  return (
    <div className="container mx-auto py-8 px-4">
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
  );
}
