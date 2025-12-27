"use client";

import { authClient } from "@/lib/auth-client";
import { organizationsApi } from "@/lib/api/modules/organizations-api";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Loader2,
  LogOut,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogPanel,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface SidebarAccountMenuProps {
  isSidebarCollapsed: boolean;
}

export function SidebarAccountMenu({
  isSidebarCollapsed,
}: SidebarAccountMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [createOrganizationDialogOpen, setCreateOrganizationDialogOpen] =
    useState(false);
  const [createOrganizationName, setCreateOrganizationName] = useState("");
  const [createOrganizationSlug, setCreateOrganizationSlug] = useState("");
  const [createOrganizationSlugTouched, setCreateOrganizationSlugTouched] =
    useState(false);

  const activeOrganizationId = useSessionStore(
    (state) => state.activeOrganizationId,
  );
  const setActiveOrganizationId = useSessionStore(
    (state) => state.setActiveOrganizationId,
  );

  const { data: session } = authClient.useSession();
  const user = session?.user;

  const organizationsQuery = useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: organizationsApi.list,
    staleTime: 60_000,
  });

  const organizations = organizationsQuery.data ?? [];

  const currentOrganization = useMemo(() => {
    if (organizations.length === 0) {
      return null;
    }

    if (activeOrganizationId) {
      return (
        organizations.find((organization) => organization.id === activeOrganizationId) ??
        organizations[0]
      );
    }

    return organizations[0];
  }, [activeOrganizationId, organizations]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((namePart) => namePart[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  function toSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  useEffect(() => {
    if (createOrganizationSlugTouched) {
      return;
    }

    setCreateOrganizationSlug(toSlug(createOrganizationName));
  }, [createOrganizationName, createOrganizationSlugTouched]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open || createOrganizationDialogOpen) {
      return;
    }

    function onDocumentMouseDown(event: MouseEvent) {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, createOrganizationDialogOpen]);

  const switchOrganizationMutation = useMutation({
    mutationFn: (organizationId: string) => organizationsApi.setActive(organizationId),
    onMutate: async (organizationId) => {
      const previousOrganizationId = useSessionStore.getState().activeOrganizationId;
      setActiveOrganizationId(organizationId);
      return { previousOrganizationId };
    },
    onError: (error: Error, _organizationId, context) => {
      setActiveOrganizationId(context?.previousOrganizationId ?? null);
      toast.error(error.message);
    },
    onSuccess: (_response, organizationId) => {
      setActiveOrganizationId(organizationId);
      void queryClient.invalidateQueries();
      router.refresh();
      setOpen(false);
      toast.success("Organization switched");
    },
  });

  const createOrganizationMutation = useMutation({
    mutationFn: async () => {
      const normalizedName = createOrganizationName.trim();
      const normalizedSlug = toSlug(createOrganizationSlug);

      if (!normalizedName) {
        throw new Error("Organization name is required");
      }

      if (!normalizedSlug) {
        throw new Error("Organization slug is required");
      }

      const createdOrganization = await organizationsApi.create({
        name: normalizedName,
        slug: normalizedSlug,
      });
      await organizationsApi.setActive(createdOrganization.id);

      return createdOrganization;
    },
    onSuccess: async (organization) => {
      setActiveOrganizationId(organization.id);
      await queryClient.invalidateQueries();
      setCreateOrganizationName("");
      setCreateOrganizationSlug("");
      setCreateOrganizationSlugTouched(false);
      setCreateOrganizationDialogOpen(false);
      setOpen(false);
      router.refresh();
      toast.success(`Organization ${organization.name} created and activated`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  async function handleSignOut() {
    await authClient.signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      {open && (
        <div
          className={cn(
            "absolute bottom-full z-30 mb-2 rounded-xl border border-border bg-card shadow-xl",
            isSidebarCollapsed ? "left-0 w-[290px]" : "left-1 right-1",
          )}
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.name ?? "User"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {user?.email ?? "No active session"}
            </p>
          </div>

          <div className="px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Organizations
            </p>
            <div className="space-y-1">
              {organizations.length === 0 ? (
                <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  No organizations yet. Create one to continue.
                </p>
              ) : (
                organizations.map((organization) => {
                  const isActive = organization.id === currentOrganization?.id;

                  return (
                    <button
                      key={organization.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition",
                        isActive
                          ? "bg-muted font-medium text-foreground"
                          : "text-foreground hover:bg-muted/70",
                      )}
                      onClick={() => {
                        if (
                          organization.id === currentOrganization?.id ||
                          switchOrganizationMutation.isPending
                        ) {
                          return;
                        }

                        switchOrganizationMutation.mutate(organization.id);
                      }}
                    >
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{organization.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="border-t border-border">
            <Link
              href="/organization-setup"
              className="flex items-center gap-2 px-4 py-3 text-sm text-foreground transition hover:bg-muted/50"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              Manage Organizations
            </Link>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-3 text-sm text-foreground transition hover:bg-muted/50"
              onClick={() => {
                setOpen(false);
                setCreateOrganizationDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              Create Organization
            </button>
            <Link
              href="/account-settings"
              className="flex items-center gap-2 px-4 py-3 text-sm text-foreground transition hover:bg-muted/50"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Account Settings
            </Link>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-500 transition hover:bg-red-50"
              onClick={() => {
                void handleSignOut();
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      <Dialog
        open={createOrganizationDialogOpen}
        onClose={() => {
          if (createOrganizationMutation.isPending) {
            return;
          }

          setCreateOrganizationDialogOpen(false);
        }}
      >
        <DialogPanel>
          <DialogClose
            onClose={() => {
              if (createOrganizationMutation.isPending) {
                return;
              }

              setCreateOrganizationDialogOpen(false);
            }}
          />
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new organization and switch your active workspace to it.
          </DialogDescription>

          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sidebar-create-organization-name">
                Organization name
              </Label>
              <Input
                id="sidebar-create-organization-name"
                placeholder="Summit Build Group"
                value={createOrganizationName}
                onChange={(event) => setCreateOrganizationName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sidebar-create-organization-slug">
                Organization slug
              </Label>
              <Input
                id="sidebar-create-organization-slug"
                placeholder="summit-build-group"
                value={createOrganizationSlug}
                onChange={(event) => {
                  setCreateOrganizationSlugTouched(true);
                  setCreateOrganizationSlug(toSlug(event.target.value));
                }}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOrganizationDialogOpen(false)}
              disabled={createOrganizationMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => createOrganizationMutation.mutate()}
              disabled={createOrganizationMutation.isPending}
            >
              {createOrganizationMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create and switch
            </Button>
          </DialogFooter>
        </DialogPanel>
      </Dialog>

      <Button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "h-auto w-full justify-between rounded-xl bg-blue-600 px-3 py-2 text-left text-white hover:bg-blue-700",
          isSidebarCollapsed ? "px-2" : "px-3",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-blue-500 text-xs text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!isSidebarCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user?.name ?? "User"}
              </p>
              <p className="truncate text-xs text-blue-100">
                {currentOrganization?.name ?? "No organization"}
              </p>
            </div>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronUp className="h-4 w-4 shrink-0" />
        )}
      </Button>
    </div>
  );
}
