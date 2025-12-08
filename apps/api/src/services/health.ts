export function healthService() {
  return {
    status: "ok",
    service: "api",
    time: new Date().toISOString(),
  };
}
