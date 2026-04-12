"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type Notification,
  notificationsApi,
} from "@/lib/api/modules/notifications-api";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const NOTIFICATION_SKELETON_KEYS = [
  "notification-skeleton-1",
  "notification-skeleton-2",
  "notification-skeleton-3",
  "notification-skeleton-4",
];

function NotificationRow({
  item,
  onMarkRead,
  onDelete,
}: {
  item: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const unread = !item.readAt;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-5 py-4 transition-colors",
        unread && "bg-primary/5",
      )}
    >
      <div
        className={cn(
          "mt-0.5 h-2 w-2 shrink-0 rounded-full",
          unread ? "bg-primary" : "bg-transparent",
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm",
            unread ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {item.title}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(item.createdAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {unread && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => onMarkRead(item.id)}
          >
            <CheckCheck className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={() => onDelete(item.id)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => notificationsApi.list(),
  });

  const notifications = data ?? [];
  const unreadNotificationIds = notifications
    .filter((notification) => !notification.readAt)
    .map((notification) => notification.id);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(unreadNotificationIds),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });

  const unreadCount = unreadNotificationIds.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={
          unreadCount > 0 ? `${unreadCount} unread` : "All caught up"
        }
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/notifications/preferences">Preferences</Link>
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
              >
                <CheckCheck className="mr-1.5 h-4 w-4" />
                Mark all read
              </Button>
            )}
          </div>
        }
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {NOTIFICATION_SKELETON_KEYS.map((rowKey) => (
              <div key={rowKey} className="flex gap-3 px-5 py-4">
                <Skeleton className="mt-1 h-2 w-2 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You're all caught up. Notifications appear here when there's activity."
            className="rounded-none border-0"
          />
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                item={n}
                onMarkRead={(id) => markReadMutation.mutate(id)}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
