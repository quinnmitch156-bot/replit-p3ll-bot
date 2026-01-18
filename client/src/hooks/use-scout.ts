import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertUser } from "@shared/schema";
import { z } from "zod";

// ==========================================
// USER HOOKS
// ==========================================

export function useUser(discordId: string) {
  return useQuery({
    queryKey: [api.users.get.path, discordId],
    queryFn: async () => {
      if (!discordId) return null;
      const url = buildUrl(api.users.get.path, { discordId });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.users.get.responses[200].parse(await res.json());
    },
    enabled: !!discordId,
  });
}

export function useSyncUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { discordId: string; username: string }) => {
      const res = await fetch(api.users.sync.path, {
        method: api.users.sync.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to sync user");
      return api.users.sync.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.users.get.path, variables.discordId] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
    },
  });
}

// ==========================================
// KEY HOOKS
// ==========================================

export function useGenerateKeys() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.keys.generate.input>) => {
      const res = await fetch(api.keys.generate.path, {
        method: api.keys.generate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to generate keys");
      return api.keys.generate.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      // Could invalidate key lists if we had that endpoint exposed
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
    },
  });
}

export function useRedeemKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.keys.redeem.input>) => {
      const res = await fetch(api.keys.redeem.path, {
        method: api.keys.redeem.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.keys.redeem.responses[400].parse(json);
          throw new Error(error.message);
        }
        throw new Error("Failed to redeem key");
      }
      
      return api.keys.redeem.responses[200].parse(json);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.users.get.path, variables.discordId] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
    },
  });
}

// ==========================================
// STATS HOOKS
// ==========================================

export function useStats() {
  return useQuery({
    queryKey: [api.stats.get.path],
    queryFn: async () => {
      const res = await fetch(api.stats.get.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.stats.get.responses[200].parse(await res.json());
    },
  });
}
