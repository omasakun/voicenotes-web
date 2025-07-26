"use client";

import type { Invitation } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistance } from "date-fns";
import { CheckCircle, Clock, Copy, ExternalLink, Plus, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTRPC } from "@/trpc/client";

export function CreateInvitationButton() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newInvitation, setNewInvitation] = useState({
    email: undefined as string | undefined,
    maxUses: 1,
    expiresInDays: 7,
  });

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const createInvitationMutation = useMutation(
    trpc.invitations.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.invitations.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.invitations.listAll.queryKey() });
        setIsCreateDialogOpen(false);
        setNewInvitation({
          email: undefined,
          maxUses: 1,
          expiresInDays: 7,
        });
        toast.success("Invitation created successfully!");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleCreateInvitation = async () => {
    await createInvitationMutation.mutateAsync(newInvitation);
  };

  return (
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Invitation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Invitation</DialogTitle>
          <DialogDescription>Generate a new invitation code to share with someone.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="Restrict to specific email"
              value={newInvitation.email}
              onChange={(e) =>
                setNewInvitation((prev) => ({
                  ...prev,
                  email: e.target.value || undefined,
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="maxUses">Max Uses</Label>
            <Input
              id="maxUses"
              type="number"
              min="1"
              max="100"
              value={newInvitation.maxUses}
              onChange={(e) =>
                setNewInvitation((prev) => ({
                  ...prev,
                  maxUses: parseInt(e.target.value) || 1,
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expiresInDays">Expires In (Days)</Label>
            <Input
              id="expiresInDays"
              type="number"
              min="1"
              max="365"
              value={newInvitation.expiresInDays}
              onChange={(e) =>
                setNewInvitation((prev) => ({
                  ...prev,
                  expiresInDays: parseInt(e.target.value) || 7,
                }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleCreateInvitation} disabled={createInvitationMutation.isPending}>
            {createInvitationMutation.isPending ? "Creating..." : "Create Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MyInvitationsCard() {
  const trpc = useTRPC();

  // TODO: pagination
  const { data: invitations } = useQuery(trpc.invitations.list.queryOptions());

  const copyInvitationLink = (code: string) => {
    const url = `${window.location.origin}/signup?code=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Invitation link copied to clipboard!");
  };

  const copyInvitationCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Invitation code copied to clipboard!");
  };

  const deleteInvitationMutation = useDeleteInvitationMutation();
  const handleDeleteInvitation = async (id: string) => {
    if (confirm("Are you sure you want to delete this invitation?")) {
      await deleteInvitationMutation.mutateAsync({ id });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Invitations</CardTitle>
        <CardDescription>Invitations you've created to invite others to join.</CardDescription>
        <CardAction>
          <CreateInvitationButton />
        </CardAction>
      </CardHeader>
      <CardContent>
        {invitations ? (
          invitations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const statusInfo = getInvitationStatus(invitation);
                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                            {invitation.code}
                          </code>
                          <Button variant="ghost" size="sm" onClick={() => copyInvitationCode(invitation.code)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {invitation.email || <span className="text-muted-foreground">Any email</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.status === "active" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {statusInfo.status === "expired" && <XCircle className="h-3 w-3 mr-1" />}
                          {statusInfo.status === "used" && <Clock className="h-3 w-3 mr-1" />}
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invitation.usedCount} / {invitation.maxUses}
                      </TableCell>
                      <TableCell>
                        {formatDistance(new Date(invitation.expiresAt), new Date(), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => copyInvitationLink(invitation.code)}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteInvitation(invitation.id)}
                            disabled={deleteInvitationMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No invitations created yet. Create your first invitation to get started.
            </div>
          )
        ) : (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        )}
      </CardContent>
    </Card>
  );
}

export function AllInvitationsCard() {
  const trpc = useTRPC();

  // TODO: pagination and filtering
  const { data: allInvitations } = useQuery(
    trpc.invitations.listAll.queryOptions({
      limit: 50,
    }),
  );

  const deleteInvitationMutation = useDeleteInvitationMutation();
  const handleDeleteInvitation = async (id: string) => {
    if (confirm("Are you sure you want to delete this invitation?")) {
      await deleteInvitationMutation.mutateAsync({ id });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Invitations</CardTitle>
        <CardDescription>View and manage all invitations created by users.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allInvitations ? (
              allInvitations.invitations.map((invitation) => {
                const statusInfo = getInvitationStatus(invitation);
                return (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                        {invitation.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invitation.inviter.name}</div>
                        <div className="text-sm text-muted-foreground">{invitation.inviter.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {invitation.email || <span className="text-muted-foreground">Any email</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {invitation.usedCount} / {invitation.maxUses}
                    </TableCell>
                    <TableCell>
                      {formatDistance(new Date(invitation.createdAt), new Date(), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteInvitation(invitation.id)}
                        disabled={deleteInvitationMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Loading invitations...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function useDeleteInvitationMutation() {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.invitations.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.invitations.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.invitations.listAll.queryKey() });
        toast.success("Invitation deleted successfully!");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );
}

const getInvitationStatus = (invitation: Invitation) => {
  const now = new Date();
  const expiresAt = new Date(invitation.expiresAt);

  if (invitation.usedCount >= invitation.maxUses) {
    return {
      status: "used",
      label: "Used",
      variant: "secondary" as const,
    };
  } else if (expiresAt < now) {
    return {
      status: "expired",
      label: "Expired",
      variant: "destructive" as const,
    };
  } else {
    return { status: "active", label: "Active", variant: "default" as const };
  }
};
