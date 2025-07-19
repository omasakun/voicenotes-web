"use client";

import { LogOut, Mail, Shield, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { InvitationManagement } from "@/app/dashboard/invitation-management";
import { UserManagement } from "@/app/dashboard/user-management";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/signin");
    }
  }, [session, isPending, router]);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isAdmin = session.user.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">Voicenotes Dashboard</h1>
              {isAdmin && (
                <Badge variant="default">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">Welcome, {session.user.name}</div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Voicenotes</CardTitle>
              <CardDescription>
                {isAdmin
                  ? "As an admin, you can manage users and invitations."
                  : "You can create invitations to invite others to join."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold">User Management</h3>
                  <p className="text-sm text-gray-600">{isAdmin ? "Manage all users" : "View your profile"}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Mail className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Invitations</h3>
                  <p className="text-sm text-gray-600">Create and manage invitations</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Security</h3>
                  <p className="text-sm text-gray-600">{isAdmin ? "Admin privileges" : "User permissions"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for different sections */}
          <Tabs defaultValue="invitations" className="space-y-4">
            <TabsList>
              <TabsTrigger value="invitations">Invitations</TabsTrigger>
              {isAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
            </TabsList>

            <TabsContent value="invitations">
              <InvitationManagement />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="users">
                <UserManagement />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
}
