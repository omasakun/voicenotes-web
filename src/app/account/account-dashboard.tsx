"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock, FileAudio, HardDrive, type LucideIcon, Settings, UserIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MyInvitationsCard } from "@/components/invitations";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { User } from "@/lib/auth";
import { formatDate, formatDuration, formatFileSize } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

export function AccountDashboard({ user }: { user: User }) {
  const trpc = useTRPC();
  const { data: stats } = useQuery(trpc.account.stats.queryOptions());

  const totalRecordings = stats?.totalRecordings || 0;
  const completedRecordings = stats?.completedRecordings || 0;
  const processingRecordings = stats?.processingRecordings || 0;
  const failedRecordings = stats?.failedRecordings || 0;
  const totalSize = stats?.totalSize || 0;
  const totalDuration = stats?.totalDuration || 0;
  const completionRate = totalRecordings > 0 ? (1 - processingRecordings / totalRecordings) * 100 : 100;

  return (
    <div className="space-y-8">
      <PageHeader title="Account Dashboard" description="Manage your account and view your recordings statistics" />

      <AccountInfoCard user={user} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          value={`${completionRate.toFixed(0)}%`}
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
            <p className="text-sm text-muted-foreground">
              {completedRecordings} recording{completedRecordings !== 1 ? "s" : ""} successfully transcribed
            </p>
          </div>
          <div>
            <p className="font-medium">Processing</p>
            <p className="text-sm text-muted-foreground">
              {processingRecordings} recording{processingRecordings !== 1 ? "s" : ""} being transcribed
            </p>
          </div>

          <div>
            <p className="font-medium">Failed</p>
            <p className="text-sm text-muted-foreground">
              {failedRecordings} recording{failedRecordings !== 1 ? "s" : ""} failed to transcribe
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Completion</span>
              <span>{completionRate.toFixed(1)}%</span>
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
  const trpc = useTRPC();

  const [name, setName] = useState(user.name);

  const updateNameMutation = useMutation(trpc.account.updateName.mutationOptions());

  const editNameHandler = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === user.name) {
      return;
    }

    try {
      await updateNameMutation.mutateAsync({ name: trimmedName });
      toast.success("Name updated successfully");
      setName(trimmedName);
    } catch (error) {
      console.error("Failed to update name:", error);
      toast.error("Failed to update name");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="h-5 w-5" />
          Account Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AccountInfoField label="Username" value={name} edit={editNameHandler} />
          <AccountInfoField label="Email" value={user.email} />
          <AccountInfoField label="Role" value={user.role || "user"} />
          <AccountInfoField label="Member since" value={formatDate(new Date(user.createdAt))} />
        </div>
      </CardContent>
    </Card>
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
    setIsSaving(true);
    try {
      await edit?.(newValue);
      setIsEditing(false);
    } catch {
      toast.error("Failed to update value");
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewValue(value);
  };

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {isEditing ? (
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2">
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
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
