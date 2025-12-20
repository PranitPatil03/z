"use client";

import {
  getHealthStatus,
  getReadinessStatus,
  getServiceInfo,
} from "@/lib/api/modules/system-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useQuery } from "@tanstack/react-query";

export function useServiceInfo() {
  return useQuery({
    queryKey: queryKeys.system.info,
    queryFn: getServiceInfo,
  });
}

export function useHealthStatus() {
  return useQuery({
    queryKey: queryKeys.system.health,
    queryFn: getHealthStatus,
    refetchInterval: 30_000,
  });
}

export function useReadinessStatus() {
  return useQuery({
    queryKey: queryKeys.system.readiness,
    queryFn: getReadinessStatus,
    refetchInterval: 30_000,
    retry: false,
  });
}
