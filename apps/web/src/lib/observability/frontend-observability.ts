export type FrontendDiagnosticEventType =
  | "window-error"
  | "window-unhandledrejection"
  | "api-request-error";

export interface FrontendDiagnosticEvent {
  type: FrontendDiagnosticEventType;
  timestamp: string;
  message: string;
  details?: Record<string, unknown>;
}

declare global {
  interface Window {
    __ANVIL_DIAGNOSTICS_INSTALLED__?: boolean;
  }
}

function emitDiagnosticEvent(event: FrontendDiagnosticEvent) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("anvil:frontend-diagnostic", {
      detail: event,
    }),
  );
}

export function reportFrontendDiagnostic(event: FrontendDiagnosticEvent) {
  emitDiagnosticEvent(event);

  if (event.type === "api-request-error") {
    console.warn("[anvil][Diagnostic]", event);
    return;
  }

  console.error("[anvil][Diagnostic]", event);
}

function hasKnownExtensionMarkers() {
  if (typeof document === "undefined") {
    return false;
  }

  return Boolean(
    document.body?.hasAttribute("jf-observer-attached") ||
      document.querySelector("[jf-ext-cache-id],[jf-ext-button-ct]"),
  );
}

function isExtensionNoise(reasonMessage: string, reasonStack: string) {
  const combined = `${reasonMessage}\n${reasonStack}`;

  if (
    combined.includes("chrome-extension://") ||
    combined.includes("frame_ant.js")
  ) {
    return true;
  }

  if (
    reasonMessage.includes("Failed to fetch") &&
    hasKnownExtensionMarkers()
  ) {
    return true;
  }

  return false;
}

export function installGlobalFrontendDiagnostics() {
  if (typeof window === "undefined") {
    return () => {};
  }

  if (window.__ANVIL_DIAGNOSTICS_INSTALLED__) {
    return () => {};
  }

  window.__ANVIL_DIAGNOSTICS_INSTALLED__ = true;

  const onError = (event: ErrorEvent) => {
    if ((event.filename ?? "").startsWith("chrome-extension://")) {
      event.preventDefault();
      return;
    }

    reportFrontendDiagnostic({
      type: "window-error",
      timestamp: new Date().toISOString(),
      message: event.message || "Unhandled window error",
      details: {
        source: event.filename,
        line: event.lineno,
        column: event.colno,
      },
    });
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reasonMessage =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);

    const reasonStack =
      event.reason instanceof Error
        ? event.reason.stack ?? ""
        : "";

    if (isExtensionNoise(reasonMessage, reasonStack)) {
      event.preventDefault();
      return;
    }

    reportFrontendDiagnostic({
      type: "window-unhandledrejection",
      timestamp: new Date().toISOString(),
      message: "Unhandled promise rejection",
      details: {
        reason: reasonMessage,
      },
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
    window.__ANVIL_DIAGNOSTICS_INSTALLED__ = false;
  };
}
