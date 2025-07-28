"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Clock, FileAudio, HardDrive, type LucideIcon, Settings, UserIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MyInvitationsCard } from "@/components/invitations";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { User } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { formatDate, formatDuration, formatFileSize } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

export function AccountDashboard({ user: initialUser }: { user: User }) {
  const trpc = useTRPC();
  const { data: session } = authClient.useSession();
  const user = session?.user || initialUser;
  const { data: stats } = useQuery(trpc.account.stats.queryOptions());

  const totalRecordings = stats?.totalRecordings || 0;
  const completedRecordings = stats?.completedRecordings || 0;
  const processingRecordings = stats?.processingRecordings || 0;
  const failedRecordings = stats?.failedRecordings || 0;
  const totalSize = stats?.totalSize || 0;
  const totalDuration = stats?.totalDuration || 0;
  const successRate = totalRecordings > 0 ? (completedRecordings / totalRecordings) * 100 : 100;
  const completionRate = totalRecordings > 0 ? (1 - processingRecordings / totalRecordings) * 100 : 100;

  return (
    <div className="space-y-8">
      <PageHeader title="Account Dashboard" description="Manage your account and view your recordings statistics" />

      <AccountInfoCard user={user} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Recordings"
          icon={FileAudio}
          value={totalRecordings}
          description={`${completedRecordings} completed`}
        />
        <StatsCard
          title="Total Duration"
          icon={Clock}
          value={formatDuration(totalDuration)}
          description="of audio content"
        />
        <StatsCard
          title="Storage Used"
          icon={HardDrive}
          value={formatFileSize(totalSize)}
          description="across all files"
        />
        <StatsCard
          title="Success Rate"
          icon={Settings}
          value={`${successRate.toFixed(0)}%`}
          description="transcription success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Processing Status</CardTitle>
          <CardDescription>Current status of your recordings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium">Finished</p>
            <p className="text-muted-foreground text-sm">
              {completedRecordings} recording{completedRecordings !== 1 ? "s" : ""} successfully transcribed
            </p>
          </div>
          <div>
            <p className="font-medium">Processing</p>
            <p className="text-muted-foreground text-sm">
              {processingRecordings} recording{processingRecordings !== 1 ? "s" : ""} being transcribed
            </p>
          </div>

          <div>
            <p className="font-medium">Failed</p>
            <p className="text-muted-foreground text-sm">
              {failedRecordings} recording{failedRecordings !== 1 ? "s" : ""} failed to transcribe
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Completion</span>
              <span>{completionRate.toFixed(2)}%</span>
            </div>
            <Progress value={completionRate} className="w-full" />
          </div>
        </CardContent>
      </Card>

      <MyInvitationsCard />
    </div>
  );
}
function AccountInfoCard({ user }: { user: User }) {
  const editNameHandler = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === user.name) {
      return;
    }

    const { error } = await authClient.updateUser({ name: trimmedName });
    if (error) {
      console.error("Failed to update name:", error);
      toast.error("Failed to update name");
      return;
    }
    toast.success("Name updated successfully");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="h-5 w-5" />
          Account Information
        </CardTitle>
        <CardAction>
          <ChangePasswordButton />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AccountInfoField label="Username" value={user.name} edit={editNameHandler} />
          <AccountInfoField label="Email" value={user.email} />
          <AccountInfoField label="Role" value={user.role || "user"} />
          <AccountInfoField label="Member since" value={formatDate(new Date(user.createdAt))} />
        </div>
      </CardContent>
    </Card>
  );
}

function ChangePasswordButton() {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
        Change Password
      </Button>
      <ChangePasswordDialog open={dialogOpen} setOpen={setDialogOpen} />
    </>
  );
}

function ChangePasswordDialog({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const changePasswordHandler = async () => {
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });

    if (error) {
      console.error("Failed to update password:", error);
      setErrorMessage(`Failed to update password: ${error.message}`);
      return;
    }

    setOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsSaving(false);
    setErrorMessage(null);
    toast.success("Password updated successfully");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input type="password" placeholder="Current Password" onChange={(e) => setCurrentPassword(e.target.value)} />
          <Input type="password" placeholder="New Password" onChange={(e) => setNewPassword(e.target.value)} />
          <Input type="password" placeholder="Confirm Password" onChange={(e) => setConfirmPassword(e.target.value)} />
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="default"
            onClick={changePasswordHandler}
            disabled={!newPassword || !confirmPassword || isSaving}
          >
            {isSaving ? "Changing..." : "Change Password"}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AccountInfoFieldProps {
  label: string;
  value: string;
  edit?: (newValue: string) => Promise<void>;
}

function AccountInfoField({ label, value, edit }: AccountInfoFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newValue, setNewValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await edit?.(newValue);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewValue(value);
  };

  return (
    <div>
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      {isEditing ? (
        <div className="flex items-center gap-2" key="edit-field">
          <Input
            type="text"
            defaultValue={value}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            onChange={(e) => setNewValue(e.target.value)}
            disabled={isSaving}
          />
          <Button variant="default" onClick={handleSave} disabled={isSaving || newValue.trim() === ""}>
            Save
          </Button>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2" key="display-field">
          <span className="text-lg">{value}</span>
          {edit && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface StatsCardProps {
  title: string;
  icon: LucideIcon;
  value: string | number;
  description?: string;
}

function StatsCard({ title, icon: Icon, value, description }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </CardContent>
    </Card>
  );
}
