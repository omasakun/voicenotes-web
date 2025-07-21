"use client";

import { formatDistanceToNow } from "date-fns";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTRPC } from "@/trpc/client";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { getStatusColor, getStatusText } from "@/lib/utils";

export function VoiceRecordings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: recordings, isLoading } = useQuery(trpc.recordings.listAll.queryOptions());

  const rescheduleRecordingMutation = useMutation(
    trpc.recordings.reschedule.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.recordings.listAll.queryKey() });
        toast.success("Recording rescheduled for processing");
      },
      onError: (error) => {
        toast.error(`Failed to reschedule: ${error.message}`);
      },
    }),
  );

  const rescheduleAllFailedMutation = useMutation(
    trpc.recordings.rescheduleAllFailed.mutationOptions({
      onSuccess: (count) => {
        queryClient.invalidateQueries({ queryKey: trpc.recordings.listAll.queryKey() });
        toast.success(`Rescheduled ${count} failed recordings`);
      },
      onError: (error) => {
        toast.error(`Failed to reschedule recordings: ${error.message}`);
      },
    }),
  );

  const handleReschedule = (recordingId: string) => {
    rescheduleRecordingMutation.mutate({ recordingId });
  };

  const handleRescheduleAllFailed = () => {
    rescheduleAllFailedMutation.mutate();
  };

  const failedCount = recordings?.filter((r) => r.status === "FAILED").length || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Voice Recordings</CardTitle>
          <CardDescription>Manage all voice recordings across all users</CardDescription>
        </div>
        {failedCount > 0 && (
          <Button
            onClick={handleRescheduleAllFailed}
            disabled={rescheduleAllFailedMutation.isPending}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reschedule All Failed ({failedCount})
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Loading recordings...</div>
        ) : !recordings?.length ? (
          <div className="text-center text-muted-foreground py-8">No recordings found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recordings.map((recording) => (
                <TableRow key={recording.id}>
                  <TableCell className="font-medium">{recording.title}</TableCell>
                  <TableCell>{recording.user.name || recording.user.email}</TableCell>
                  <TableCell>
                    {" "}
                    <Badge className={getStatusColor(recording.status)}>{getStatusText(recording.status)}</Badge>
                  </TableCell>
                  <TableCell>{formatDistanceToNow(new Date(recording.createdAt), { addSuffix: true })}</TableCell>
                  <TableCell>{recording.duration ? `${Math.round(recording.duration)}s` : "N/A"}</TableCell>
                  <TableCell>
                    {recording.status !== "PROCESSING" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReschedule(recording.id)}
                        disabled={rescheduleRecordingMutation.isPending}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reschedule
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
