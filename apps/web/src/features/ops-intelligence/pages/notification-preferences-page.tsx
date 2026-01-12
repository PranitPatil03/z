"use client";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { notificationsApi } from "@/lib/api/modules/notifications-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const EVENT_KEYS = [
  "invoice_submitted",
  "change_order_submitted",
  "budget_alert",
  "compliance_risk",
] as const;

type EventKey = (typeof EVENT_KEYS)[number];

interface EventPreferenceState {
  inApp: boolean;
  email: boolean;
}

export function NotificationPreferencesPage() {
  const qc = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: () => notificationsApi.getPreferences(),
  });

  const [defaults, setDefaults] = useState<EventPreferenceState>({
    inApp: true,
    email: true,
  });
  const [events, setEvents] = useState<Record<EventKey, EventPreferenceState>>({
    invoice_submitted: { inApp: true, email: true },
    change_order_submitted: { inApp: true, email: true },
    budget_alert: { inApp: true, email: true },
    compliance_risk: { inApp: true, email: true },
  });

  useEffect(() => {
    const data = preferencesQuery.data;
    if (!data) {
      return;
    }

    setDefaults(data.defaults);
    setEvents({
      invoice_submitted: data.events.invoice_submitted ?? data.defaults,
      change_order_submitted:
        data.events.change_order_submitted ?? data.defaults,
      budget_alert: data.events.budget_alert ?? data.defaults,
      compliance_risk: data.events.compliance_risk ?? data.defaults,
    });
  }, [preferencesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      notificationsApi.updatePreferences({
        defaults,
        events,
      }),
    onSuccess: () => {
      toast.success("Notification preferences saved");
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Preferences"
        description="Configure in-app and email delivery by event type."
      />

      <div className="rounded-xl bg-card/70 p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Defaults</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-sm font-medium text-foreground">
              In-app notifications
            </span>
            <input
              type="checkbox"
              checked={defaults.inApp}
              className="h-4 w-4"
              onChange={(event) =>
                setDefaults((current) => ({
                  ...current,
                  inApp: event.target.checked,
                }))
              }
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-sm font-medium text-foreground">
              Email notifications
            </span>
            <input
              type="checkbox"
              checked={defaults.email}
              className="h-4 w-4"
              onChange={(event) =>
                setDefaults((current) => ({
                  ...current,
                  email: event.target.checked,
                }))
              }
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl bg-card/70 p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Event Overrides
          </h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {EVENT_KEYS.map((eventKey) => (
            <div
              key={eventKey}
              className="w-full rounded-lg bg-muted/30 px-3 py-3 md:w-[280px]"
            >
              <p className="mb-2 text-sm font-medium capitalize text-foreground">
                {eventKey.replace(/_/g, " ")}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-md bg-background px-2.5 py-1.5 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={events[eventKey].inApp}
                    className="h-4 w-4"
                    onChange={(event) =>
                      setEvents((current) => ({
                        ...current,
                        [eventKey]: {
                          ...current[eventKey],
                          inApp: event.target.checked,
                        },
                      }))
                    }
                  />
                  In-app
                </label>
                <label className="inline-flex items-center gap-2 rounded-md bg-background px-2.5 py-1.5 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={events[eventKey].email}
                    className="h-4 w-4"
                    onChange={(event) =>
                      setEvents((current) => ({
                        ...current,
                        [eventKey]: {
                          ...current[eventKey],
                          email: event.target.checked,
                        },
                      }))
                    }
                  />
                  Email
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <BellRing className="mr-2 h-4 w-4" />
          )}
          Save preferences
        </Button>
      </div>
    </div>
  );
}
