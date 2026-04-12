"use client";

import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type CreateSmartMailDraftInput,
  type SmartMailLinkedEntityType,
  type SmartMailMessage,
  smartmailApi,
} from "@/lib/api/modules/smartmail-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const LINKED_ENTITY_TYPES: SmartMailLinkedEntityType[] = [
  "purchase_order",
  "invoice",
  "change_order",
  "subcontractor",
];

const AI_PROVIDERS: NonNullable<CreateSmartMailDraftInput["provider"]>[] = [
  "openai",
  "anthropic",
  "gemini",
  "azure-openai",
];

function parseCsv(input: string) {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface SmartMailThreadPageProps {
  threadId: string;
}

export function SmartMailThreadPage({ threadId }: SmartMailThreadPageProps) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const projectIdParam = searchParams.get("projectId")?.trim() ?? "";
  const accountIdParam = searchParams.get("accountId")?.trim() ?? "";

  const [composeForm, setComposeForm] = useState({
    projectId: projectIdParam,
    accountId: accountIdParam,
    toEmailsText: "",
    ccEmailsText: "",
    subject: "",
    body: "",
    linkedEntityType: "" as SmartMailLinkedEntityType | "",
    linkedEntityId: "",
    sendNow: true,
    aiDraft: false,
    inReplyToMessageId: "",
  });

  const [draftForm, setDraftForm] = useState({
    projectId: projectIdParam,
    accountId: accountIdParam,
    prompt: "",
    tone: "",
    provider: "openai" as NonNullable<CreateSmartMailDraftInput["provider"]>,
    model: "",
    templateId: "",
    linkedEntityType: "" as SmartMailLinkedEntityType | "",
    linkedEntityId: "",
  });

  const [selectedMessageId, setSelectedMessageId] = useState("");
  const [linkForm, setLinkForm] = useState({
    linkedEntityType: "" as SmartMailLinkedEntityType | "",
    linkedEntityId: "",
    clear: false,
  });

  useEffect(() => {
    if (projectIdParam.length > 0) {
      setComposeForm((current) => ({ ...current, projectId: projectIdParam }));
      setDraftForm((current) => ({ ...current, projectId: projectIdParam }));
    }

    if (accountIdParam.length > 0) {
      setComposeForm((current) => ({ ...current, accountId: accountIdParam }));
      setDraftForm((current) => ({ ...current, accountId: accountIdParam }));
    }
  }, [accountIdParam, projectIdParam]);

  const accountsQuery = useQuery({
    queryKey: queryKeys.smartmailAccounts.list(),
    queryFn: smartmailApi.listAccounts,
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.smartmailTemplates.list({
      projectId: composeForm.projectId || undefined,
    }),
    queryFn: () =>
      smartmailApi.listTemplates({
        projectId: composeForm.projectId || undefined,
      }),
  });

  const messagesQuery = useQuery({
    queryKey: queryKeys.smartmailMessages.list(threadId),
    queryFn: () => smartmailApi.listMessages(threadId),
  });

  useEffect(() => {
    if (composeForm.accountId.length > 0) {
      return;
    }

    const firstAccountId = accountsQuery.data?.[0]?.id;
    if (!firstAccountId) {
      return;
    }

    setComposeForm((current) => ({ ...current, accountId: firstAccountId }));
    setDraftForm((current) => ({ ...current, accountId: firstAccountId }));
  }, [accountsQuery.data, composeForm.accountId.length]);

  useEffect(() => {
    const firstMessage = messagesQuery.data?.[0];
    if (!firstMessage) {
      setSelectedMessageId("");
      return;
    }

    const currentSelectedExists = (messagesQuery.data ?? []).some(
      (message) => message.id === selectedMessageId,
    );

    if (!currentSelectedExists) {
      setSelectedMessageId(firstMessage.id);
    }
  }, [messagesQuery.data, selectedMessageId]);

  const selectedMessage = useMemo(
    () =>
      (messagesQuery.data ?? []).find(
        (message) => message.id === selectedMessageId,
      ) ?? null,
    [messagesQuery.data, selectedMessageId],
  );

  useEffect(() => {
    if (!selectedMessage) {
      setLinkForm({ linkedEntityType: "", linkedEntityId: "", clear: false });
      return;
    }

    setLinkForm({
      linkedEntityType: selectedMessage.linkedEntityType ?? "",
      linkedEntityId: selectedMessage.linkedEntityId ?? "",
      clear: false,
    });
  }, [selectedMessage]);

  const createMessageMutation = useMutation({
    mutationFn: () => {
      const projectId = composeForm.projectId.trim();
      const accountId = composeForm.accountId.trim();
      const toEmails = parseCsv(composeForm.toEmailsText);

      if (!projectId) {
        throw new Error("Project ID is required");
      }

      if (!accountId) {
        throw new Error("Account is required");
      }

      if (toEmails.length === 0) {
        throw new Error("At least one recipient email is required");
      }

      if (composeForm.body.trim().length === 0) {
        throw new Error("Message body is required");
      }

      return smartmailApi.createMessage(threadId, {
        projectId,
        accountId,
        toEmails,
        ccEmails: parseCsv(composeForm.ccEmailsText),
        subject: toOptional(composeForm.subject),
        body: composeForm.body,
        linkedEntityType:
          composeForm.linkedEntityType === ""
            ? undefined
            : composeForm.linkedEntityType,
        linkedEntityId: toOptional(composeForm.linkedEntityId),
        sendNow: composeForm.sendNow,
        aiDraft: composeForm.aiDraft,
        inReplyToMessageId: toOptional(composeForm.inReplyToMessageId),
      });
    },
    onSuccess: (message) => {
      toast.success(composeForm.sendNow ? "Message sent" : "Draft saved");
      setComposeForm((current) => ({
        ...current,
        ccEmailsText: "",
        subject: "",
        body: "",
        linkedEntityType: "",
        linkedEntityId: "",
        aiDraft: false,
        inReplyToMessageId: "",
      }));
      setSelectedMessageId(message.id);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.smartmailMessages.list(threadId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.smartmailThreads.all,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createDraftMutation = useMutation({
    mutationFn: () => {
      const projectId = draftForm.projectId.trim();
      const accountId = draftForm.accountId.trim();

      if (!projectId) {
        throw new Error("Project ID is required for AI draft generation");
      }

      if (!accountId) {
        throw new Error("Account is required for AI draft generation");
      }

      if (draftForm.prompt.trim().length < 10) {
        throw new Error("Prompt must be at least 10 characters");
      }

      return smartmailApi.createDraft(threadId, {
        projectId,
        accountId,
        prompt: draftForm.prompt.trim(),
        tone: toOptional(draftForm.tone),
        provider: draftForm.provider,
        model: toOptional(draftForm.model),
        templateId: toOptional(draftForm.templateId),
        linkedEntityType:
          draftForm.linkedEntityType === ""
            ? undefined
            : draftForm.linkedEntityType,
        linkedEntityId: toOptional(draftForm.linkedEntityId),
      });
    },
    onSuccess: (result) => {
      toast.success("AI draft generated");
      setComposeForm((current) => ({
        ...current,
        projectId: draftForm.projectId.trim(),
        accountId: draftForm.accountId.trim(),
        subject: result.message.subject,
        body: result.draft,
        linkedEntityType: (result.message.linkedEntityType ?? "") as
          | SmartMailLinkedEntityType
          | "",
        linkedEntityId: result.message.linkedEntityId ?? "",
        aiDraft: true,
      }));

      setDraftForm((current) => ({
        ...current,
        prompt: "",
        tone: "",
        model: "",
      }));

      setSelectedMessageId(result.message.id);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.smartmailMessages.list(threadId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.smartmailThreads.all,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateLinkMutation = useMutation({
    mutationFn: () => {
      if (!selectedMessageId) {
        throw new Error("Select a message first");
      }

      if (linkForm.clear) {
        return smartmailApi.updateMessageLink(selectedMessageId, {
          clear: true,
        });
      }

      if (!linkForm.linkedEntityType || !linkForm.linkedEntityId.trim()) {
        throw new Error("Entity type and entity ID are required");
      }

      return smartmailApi.updateMessageLink(selectedMessageId, {
        clear: false,
        linkedEntityType: linkForm.linkedEntityType,
        linkedEntityId: linkForm.linkedEntityId.trim(),
      });
    },
    onSuccess: () => {
      toast.success(
        linkForm.clear ? "Message link cleared" : "Message link updated",
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.smartmailMessages.list(threadId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.smartmailThreads.all,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const messageColumns: DataTableColumn<SmartMailMessage>[] = [
    {
      key: "subject",
      header: "Message",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.subject}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {row.body}
          </p>
        </div>
      ),
    },
    {
      key: "direction",
      header: "Direction",
      width: "160px",
      render: (row) => (
        <div>
          <p className="text-xs text-foreground">{row.direction}</p>
          <p className="text-xs text-muted-foreground">{row.status}</p>
        </div>
      ),
    },
    {
      key: "emails",
      header: "From → To",
      width: "280px",
      render: (row) => (
        <p className="text-xs text-muted-foreground">
          {row.fromEmail} → {row.toEmail || "(unspecified)"}
        </p>
      ),
    },
    {
      key: "linked",
      header: "Linked",
      width: "220px",
      render: (row) => (
        <p className="text-xs text-muted-foreground">
          {row.linkedEntityType && row.linkedEntityId
            ? `${row.linkedEntityType}: ${row.linkedEntityId}`
            : "Not linked"}
        </p>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      width: "200px",
      render: (row) => (
        <p className="text-xs text-muted-foreground">
          {formatDateTime(row.sentAt ?? row.updatedAt)}
        </p>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SmartMail Thread"
        description={`Thread ${threadId}`}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/smartmail">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to SmartMail
            </Link>
          </Button>
        }
      />

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Thread context
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="smartmail-thread-project-id">Project ID</Label>
            <Input
              id="smartmail-thread-project-id"
              value={composeForm.projectId}
              onChange={(event) => {
                const value = event.target.value;
                setComposeForm((current) => ({ ...current, projectId: value }));
                setDraftForm((current) => ({ ...current, projectId: value }));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smartmail-thread-account-id">Account</Label>
            <Select
              id="smartmail-thread-account-id"
              value={composeForm.accountId}
              onChange={(event) => {
                const value = event.target.value;
                setComposeForm((current) => ({ ...current, accountId: value }));
                setDraftForm((current) => ({ ...current, accountId: value }));
              }}
            >
              <option value="">Select account</option>
              {(accountsQuery.data ?? []).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.email} ({account.provider})
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Compose message
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input
            placeholder="To emails (comma-separated)"
            value={composeForm.toEmailsText}
            onChange={(event) =>
              setComposeForm((current) => ({
                ...current,
                toEmailsText: event.target.value,
              }))
            }
          />
          <Input
            placeholder="CC emails (comma-separated)"
            value={composeForm.ccEmailsText}
            onChange={(event) =>
              setComposeForm((current) => ({
                ...current,
                ccEmailsText: event.target.value,
              }))
            }
          />
          <Input
            className="md:col-span-2"
            placeholder="Subject (optional, defaults to thread subject)"
            value={composeForm.subject}
            onChange={(event) =>
              setComposeForm((current) => ({
                ...current,
                subject: event.target.value,
              }))
            }
          />
          <textarea
            className="md:col-span-2 flex min-h-[130px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
            placeholder="Message body"
            value={composeForm.body}
            onChange={(event) =>
              setComposeForm((current) => ({
                ...current,
                body: event.target.value,
              }))
            }
          />
          <Select
            value={composeForm.linkedEntityType}
            onChange={(event) =>
              setComposeForm((current) => ({
                ...current,
                linkedEntityType: event.target.value as
                  | SmartMailLinkedEntityType
                  | "",
              }))
            }
          >
            <option value="">No linked entity override</option>
            {LINKED_ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Linked entity ID (optional)"
            value={composeForm.linkedEntityId}
            onChange={(event) =>
              setComposeForm((current) => ({
                ...current,
                linkedEntityId: event.target.value,
              }))
            }
          />
          <Input
            placeholder="In-reply-to message ID (optional)"
            value={composeForm.inReplyToMessageId}
            onChange={(event) =>
              setComposeForm((current) => ({
                ...current,
                inReplyToMessageId: event.target.value,
              }))
            }
          />
          <div className="flex items-center gap-4 text-sm text-foreground">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={composeForm.sendNow}
                onChange={(event) =>
                  setComposeForm((current) => ({
                    ...current,
                    sendNow: event.target.checked,
                  }))
                }
              />
              Send now
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={composeForm.aiDraft}
                onChange={(event) =>
                  setComposeForm((current) => ({
                    ...current,
                    aiDraft: event.target.checked,
                  }))
                }
              />
              Mark as AI draft
            </label>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            onClick={() => createMessageMutation.mutate()}
            disabled={createMessageMutation.isPending}
          >
            Send or save draft
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Generate AI draft
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <textarea
            className="md:col-span-2 flex min-h-[100px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
            placeholder="Prompt (min 10 characters)"
            value={draftForm.prompt}
            onChange={(event) =>
              setDraftForm((current) => ({
                ...current,
                prompt: event.target.value,
              }))
            }
          />
          <Input
            placeholder="Tone (optional)"
            value={draftForm.tone}
            onChange={(event) =>
              setDraftForm((current) => ({
                ...current,
                tone: event.target.value,
              }))
            }
          />
          <Input
            placeholder="Model override (optional)"
            value={draftForm.model}
            onChange={(event) =>
              setDraftForm((current) => ({
                ...current,
                model: event.target.value,
              }))
            }
          />
          <Select
            value={draftForm.provider}
            onChange={(event) =>
              setDraftForm((current) => ({
                ...current,
                provider: event.target.value as NonNullable<
                  CreateSmartMailDraftInput["provider"]
                >,
              }))
            }
          >
            {AI_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </Select>
          <Select
            value={draftForm.templateId}
            onChange={(event) =>
              setDraftForm((current) => ({
                ...current,
                templateId: event.target.value,
              }))
            }
          >
            <option value="">No template</option>
            {(templatesQuery.data ?? []).map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.type})
              </option>
            ))}
          </Select>
          <Select
            value={draftForm.linkedEntityType}
            onChange={(event) =>
              setDraftForm((current) => ({
                ...current,
                linkedEntityType: event.target.value as
                  | SmartMailLinkedEntityType
                  | "",
              }))
            }
          >
            <option value="">No linked entity override</option>
            {LINKED_ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Linked entity ID (optional)"
            value={draftForm.linkedEntityId}
            onChange={(event) =>
              setDraftForm((current) => ({
                ...current,
                linkedEntityId: event.target.value,
              }))
            }
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            variant="outline"
            onClick={() => createDraftMutation.mutate()}
            disabled={createDraftMutation.isPending}
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            Generate draft
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Manual link override
        </h2>
        {!selectedMessage ? (
          <EmptyState
            title="No message selected"
            description="Select a message from the list below to edit entity links."
            className="border-none"
          />
        ) : (
          <>
            <p className="mt-2 text-xs text-muted-foreground">
              Selected message: {selectedMessage.subject} ({selectedMessage.id})
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Select
                value={linkForm.linkedEntityType}
                disabled={linkForm.clear}
                onChange={(event) =>
                  setLinkForm((current) => ({
                    ...current,
                    linkedEntityType: event.target.value as
                      | SmartMailLinkedEntityType
                      | "",
                  }))
                }
              >
                <option value="">Select entity type</option>
                {LINKED_ENTITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="Linked entity ID"
                disabled={linkForm.clear}
                value={linkForm.linkedEntityId}
                onChange={(event) =>
                  setLinkForm((current) => ({
                    ...current,
                    linkedEntityId: event.target.value,
                  }))
                }
              />
              <label className="md:col-span-2 flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={linkForm.clear}
                  onChange={(event) =>
                    setLinkForm((current) => ({
                      ...current,
                      clear: event.target.checked,
                    }))
                  }
                />
                Clear existing link instead of updating it
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                onClick={() => updateLinkMutation.mutate()}
                disabled={updateLinkMutation.isPending}
              >
                Save link
              </Button>
            </div>
          </>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Thread messages
        </h2>
        {messagesQuery.isLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : (
          <DataTable
            columns={messageColumns}
            data={messagesQuery.data ?? []}
            rowKey={(row) => row.id}
            onRowClick={(row) => setSelectedMessageId(row.id)}
            emptyState={
              <EmptyState
                title="No messages"
                description="Send a message or generate an AI draft to start this thread."
                className="border-none"
              />
            }
          />
        )}
      </section>
    </div>
  );
}
