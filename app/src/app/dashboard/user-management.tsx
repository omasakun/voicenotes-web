"use client";

import { formatDistance } from "date-fns";
import { Ban, CheckCircle, MoreHorizontal, Search, Shield } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useBanUserMutation,
  useImpersonateUserMutation,
  useListUsers,
  useRemoveUserMutation,
  useSetRoleMutation,
  useUnbanUserMutation,
} from "@/hooks/auth-admin";

export function UserManagement() {
  const [search, setSearch] = useState("");

  // TODO: pagination and sorting
  const { data: usersData, isLoading } = useListUsers({ search });

  const banUserMutation = useBanUserMutation();
  const unbanUserMutation = useUnbanUserMutation();
  const deleteUserMutation = useRemoveUserMutation();
  const updateUserMutation = useSetRoleMutation();
  const impersonateUserMutation = useImpersonateUserMutation();

  const banUserHandler = (userId: string) => async () => {
    const reason = prompt("Reason for ban:");
    if (reason) {
      await banUserMutation.mutateAsync({
        userId,
        reason,
      });
    }
  };

  const unbanUserHandler = (userId: string) => async () => {
    await unbanUserMutation.mutateAsync({ userId });
  };

  const deleteUserHandler = (userId: string) => async () => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      await deleteUserMutation.mutateAsync({ userId });
    }
  };

  const toggleAdminHandler = (userId: string, currentRole: string | null) => async () => {
    await updateUserMutation.mutateAsync({
      userId,
      role: currentRole === "admin" ? "user" : "admin",
    });
  };

  const impersonateUserHandler = (userId: string, userName: string) => async () => {
    if (confirm(`Are you sure you want to impersonate user "${userName}"? You will be logged in as this user.`)) {
      await impersonateUserMutation.mutateAsync({ userId });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage user accounts, roles, and permissions.</CardDescription>
          <CardAction>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-[300px] pl-8"
                />
              </div>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited By</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : (
                usersData?.users?.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-muted-foreground text-sm">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role === "admin" ? (
                        <Badge variant="default">
                          <Shield className="mr-1 h-3 w-3" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">User</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.banned ? (
                        <Badge variant="destructive">
                          <Ban className="mr-1 h-3 w-3" />
                          Banned
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.inviterId ? (
                        <div className="text-sm">
                          Invited by user
                          <div className="text-muted-foreground text-xs">ID: {user.inviterId}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatDistance(new Date(user.createdAt), new Date(), {
                          addSuffix: true,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Sessions: {user.session?.length || 0}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={toggleAdminHandler(user.id, user.role)}>
                            {user.role === "admin" ? "Remove Admin" : "Make Admin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={impersonateUserHandler(user.id, user.name)}>
                            Impersonate User
                          </DropdownMenuItem>
                          {user.banned ? (
                            <DropdownMenuItem onClick={unbanUserHandler(user.id)}>Unban User</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={banUserHandler(user.id)}>Ban User</DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={deleteUserHandler(user.id)} className="text-destructive">
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
