export function getHealth() {
  return {
    status: "ok",
    service: "api",
    time: new Date().toISOString(),
  };
}
