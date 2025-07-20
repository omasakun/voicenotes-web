"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, FileAudio, Play, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatDuration, formatFileSize, getStatusColor, getStatusText } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

export function RecordingsList() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const router = useRouter();
  const trpc = useTRPC();

  const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery(
    trpc.recordings.list.infiniteQueryOptions(
      {
        limit: 10,
        search: search || undefined,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    ),
  );

  // TODO: call useMutation for each recording entry
  const deleteRecording = useMutation(
    trpc.recordings.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Recording deleted");
        queryClient.invalidateQueries({ queryKey: trpc.recordings.list.infiniteQueryKey() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const recordings = useMemo(() => {
    return data?.pages.flatMap((page) => page.recordings) ?? [];
  }, [data]);

  // Poll for updates if any recording is PROCESSING
  // TODO: server notifications would be better
  useEffect(() => {
    if (!recordings.some((r) => r.status === "PROCESSING")) return;
    const timer = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: trpc.recordings.list.infiniteQueryKey() });
    }, 1000);
    return () => clearInterval(timer);
  }, [recordings, queryClient, trpc.recordings.list]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this recording?")) {
      deleteRecording.mutate({ id });
    }
  };

  const handlePlay = (id: string) => {
    router.push(`/recordings/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search recordings..." onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <p>Loading recordings...</p>
        </div>
      )}

      {!isLoading && recordings.length === 0 && (
        <div className="text-center py-8">
          <FileAudio className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No recordings found</p>
          <p className="text-muted-foreground">
            {search ? "Try adjusting your search terms" : "Upload your first recording to get started"}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {recordings.map((recording) => (
          <Card key={recording.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2">
                <Button variant="link" className="text-lg p-0" onClick={() => handlePlay(recording.id)}>
                  {recording.title}
                </Button>
                <Badge className={getStatusColor(recording.status)}>{getStatusText(recording.status)}</Badge>
              </CardTitle>
              <CardDescription className="flex items-center gap-2 text-sm">
                <Clock className="h-3 w-3" />
                {recording.duration ? formatDuration(recording.duration) : "Unknown Duration"}
                <Separator orientation="vertical" />
                {formatFileSize(recording.fileSize)}
                <Separator orientation="vertical" />
                {formatDate(new Date(recording.createdAt))}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {recording.status === "PROCESSING" && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Transcription Progress</span>
                    <span>{recording.transcriptionProgress}%</span>
                  </div>
                  <Progress value={recording.transcriptionProgress} className="w-full" />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => handlePlay(recording.id)}>
                  <Play className="h-3 w-3" />
                  Play
                </Button>
                <Button
                  variant="outline-destructive"
                  size="sm"
                  onClick={() => handleDelete(recording.id)}
                  disabled={deleteRecording.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasNextPage && (
        <div className="text-center">
          <Button variant="outline" onClick={() => fetchNextPage()}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
