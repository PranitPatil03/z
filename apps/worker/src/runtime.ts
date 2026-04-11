export function resolveWorkerMode(
  redisUrl: string | undefined,
): "active" | "idle" {
  return redisUrl ? "active" : "idle";
}
