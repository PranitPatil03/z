"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type SmartMailAccount,
  type SmartMailThread,
  smartmailApi,
} from "@/lib/api/modules/smartmail-api";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Mail, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

const THREAD_SKELETON_KEYS = [
  "thread-skeleton-1",
  "thread-skeleton-2",
  "thread-skeleton-3",
  "thread-skeleton-4",
  "thread-skeleton-5",
];

function AccountCard({
  account,
  onDisconnect,
  onSync,
}: {
  account: SmartMailAccount;
  onDisconnect: () => void;
  onSync: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Mail className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{account.email}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {account.provider} ·{" "}
            {account.isActive ? "Connected" : "Disconnected"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onSync}
          title="Sync"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={onDisconnect}
          title="Disconnect"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ThreadRow({ thread }: { thread: SmartMailThread }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-5 py-4",
        !thread.isRead && "bg-primary/5",
      )}
    >
      <div
        className={cn(
          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
          !thread.isRead ? "bg-primary" : "bg-transparent",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-sm truncate",
              !thread.isRead
                ? "font-semibold text-foreground"
                : "text-foreground",
            )}
          >
            {thread.subject || "(no subject)"}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Date(thread.lastMessageAt).toLocaleDateString()}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{thread.from}</p>
        {thread.snippet && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {thread.snippet}
          </p>
        )}
      </div>
    </div>
  );
}

export function SmartMailPage() {
  const qc = useQueryClient();

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: queryKeys.smartmailAccounts.list(),
    queryFn: smartmailApi.listAccounts,
  });

  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: queryKeys.smartmailThreads.list(),
    queryFn: () => smartmailApi.listThreads({ limit: 30 }),
    enabled: (accounts?.data ?? []).length > 0,
  });

  const connectMutation = useMutation({
    mutationFn: (provider: "gmail" | "outlook") =>
      smartmailApi.connectAccount(provider),
    onSuccess: (result) => {
      window.location.href = result.authUrl;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => smartmailApi.disconnectAccount(id),
    onSuccess: () => {
      toast.success("Account disconnected");
      qc.invalidateQueries({ queryKey: queryKeys.smartmailAccounts.all });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => smartmailApi.syncAccount(id),
    onSuccess: () => {
      toast.success("Sync started");
      qc.invalidateQueries({ queryKey: queryKeys.smartmailThreads.all });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hasAccounts = (accounts?.data ?? []).length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="SmartMail"
        description="Connect your inbox and track project-related communications."
        action={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => connectMutation.mutate("gmail")}
              disabled={connectMutation.isPending}
            >
              <Link2 className="mr-1.5 h-4 w-4" />
              Connect Gmail
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => connectMutation.mutate("outlook")}
              disabled={connectMutation.isPending}
            >
              <Link2 className="mr-1.5 h-4 w-4" />
              Connect Outlook
            </Button>
          </div>
        }
      />

      {/* Connected accounts */}
      {accountsLoading ? (
        <Skeleton className="h-16 w-full rounded-xl" />
      ) : (accounts?.data ?? []).length > 0 ? (
        <div className="space-y-2">
          {(accounts?.data ?? []).map((acct) => (
            <AccountCard
              key={acct.id}
              account={acct}
              onDisconnect={() => disconnectMutation.mutate(acct.id)}
              onSync={() => syncMutation.mutate(acct.id)}
            />
          ))}
        </div>
      ) : null}

      {/* Thread list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Inbox</h2>
        </div>
        {!hasAccounts ? (
          <EmptyState
            icon={Mail}
            title="No accounts connected"
            description="Connect Gmail or Outlook to see your project-related threads here."
            className="rounded-none border-0"
          />
        ) : threadsLoading ? (
          <div className="divide-y divide-border px-5">
            {THREAD_SKELETON_KEYS.map((rowKey) => (
              <div key={rowKey} className="py-4 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : (threads?.data ?? []).length === 0 ? (
          <EmptyState
            title="No threads yet"
            description="Sync your account to load threads."
            className="rounded-none border-0"
          />
        ) : (
          <div className="divide-y divide-border">
            {(threads?.data ?? []).map((t) => (
              <ThreadRow key={t.id} thread={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
