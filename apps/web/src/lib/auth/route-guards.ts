const INTERNAL_PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/portal",
  "/portal/login",
  "/portal/register",
  "/portal/invitations/accept",
  "/portal/forgot-password",
  "/portal/reset-password",
];

const PORTAL_PUBLIC_PATHS = [
  "/portal",
  "/portal/login",
  "/portal/register",
  "/portal/invitations/accept",
  "/portal/forgot-password",
  "/portal/reset-password",
];

const INTERNAL_PROTECTED_PATHS = [
  "/dashboard",
  "/activity-feed",
  "/audit-log",
  "/notifications",
  "/projects",
  "/members",
  "/change-orders",
  "/invoices",
  "/purchase-orders",
  "/rfqs",
  "/receipts",
  "/match-runs",
  "/budgets",
  "/site-snaps",
  "/subconnect",
  "/smartmail",
  "/billing",
  "/organization-setup",
  "/account-settings",
  "/module",
  "/command-center",
  "/integrations",
];

function matchesPath(pathname: string, path: string, allowNested: boolean) {
  if (pathname === path) {
    return true;
  }

  if (!allowNested) {
    return false;
  }

  return pathname.startsWith(`${path}/`);
}

export function isStaticOrSystemPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  );
}

export function isInternalPublicPath(pathname: string) {
  return INTERNAL_PUBLIC_PATHS.some((path) =>
    matchesPath(pathname, path, true),
  );
}

export function isPortalPublicPath(pathname: string) {
  return PORTAL_PUBLIC_PATHS.some((path) =>
    matchesPath(pathname, path, path !== "/portal"),
  );
}

export function isInternalProtectedPath(pathname: string) {
  return INTERNAL_PROTECTED_PATHS.some((path) =>
    matchesPath(pathname, path, true),
  );
}

export function isPortalProtectedPath(pathname: string) {
  return pathname.startsWith("/portal") && !isPortalPublicPath(pathname);
}
