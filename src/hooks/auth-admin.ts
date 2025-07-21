import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

const queryKey = "auth-admin";

type Role = "admin" | "user";

export function useListUsers(options: { search?: string; limit?: number; offset?: number }) {
  const { search, limit, offset = 0 } = options;
  return useQuery({
    queryKey: [queryKey, "list", search, limit, offset],
    queryFn: async () => {
      const response = await authClient.admin.listUsers({
        query: {
          limit,
          offset,
          ...(search && {
            searchField: "email",
            searchOperator: "contains",
            searchValue: search,
          }),
        },
      });

      const users = response.data?.users || [];
      const total = response.data?.total || 0;

      return { users, total };
    },
  });
}

export function useBanUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const response = await authClient.admin.banUser({
        userId,
        banReason: reason,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });
}

export function useUnbanUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const response = await authClient.admin.unbanUser({
        userId,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });
}

export function useRemoveUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const response = await authClient.admin.removeUser({
        userId,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });
}

export function useSetRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const response = await authClient.admin.setRole({
        userId,
        role,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });
}

export function useImpersonateUserMutation() {
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const response = await authClient.admin.impersonateUser({
        userId,
      });
      return response;
    },
    onSuccess: () => {
      // Refresh the page to reload the session with impersonation
      window.location.reload();
    },
  });
}

export function useStopImpersonatingMutation() {
  return useMutation({
    mutationFn: async () => {
      const response = await authClient.admin.stopImpersonating();
      return response;
    },
    onSuccess: () => {
      // Refresh the page to reload the session without impersonation
      window.location.reload();
    },
  });
}
