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
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
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

const PRAVATAR_IMAGE_IDS = [
  1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 18, 19, 20, 21, 22, 23,
  24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 36, 37, 39, 40, 41, 42, 44, 45,
  46, 47, 48, 49, 50, 51, 53, 54, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65,
  66, 67, 68, 69,
] as const;

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
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
  const [avatarLoadError, setAvatarLoadError] = useState(false);
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

  const avatarSeed = `${user?.id ?? "anonymous"}:${user?.email ?? "anonymous@example.com"}`;
  const avatarImageId =
    PRAVATAR_IMAGE_IDS[hashSeed(avatarSeed) % PRAVATAR_IMAGE_IDS.length];
  const dummyAvatarUrl = `https://i.pravatar.cc/120?img=${avatarImageId}`;

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    "AC";

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

  useEffect(() => {
    setAvatarLoadError(false);
  }, [dummyAvatarUrl]);

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
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-destructive transition hover:bg-destructive/10"
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
        suppressHydrationWarning
        className={cn(
          "h-auto w-full justify-between rounded-xl bg-primary px-3 py-2 text-left text-primary-foreground hover:bg-primary/90",
          isSidebarCollapsed ? "px-2" : "px-3",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="h-7 w-7 shrink-0">
            {!avatarLoadError && (
              <AvatarImage
                src={dummyAvatarUrl}
                onError={() => setAvatarLoadError(true)}
              />
            )}
            <AvatarFallback className="bg-primary/20 text-xs text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!isSidebarCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user?.name?.trim() || "Account"}
              </p>
              <p className="truncate text-xs text-primary-foreground/80">
                {currentOrganization?.name || "No active organization"}
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
