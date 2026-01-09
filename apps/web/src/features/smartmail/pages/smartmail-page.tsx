"use client";

import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import {
  Select as RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-radix";
import { Skeleton } from "@/components/ui/skeleton";
import { type OAuthProvider, oauthApi } from "@/lib/api/modules/oauth-api";
import { projectsApi } from "@/lib/api/modules/projects-api";
import {
  type CreateSmartMailTemplateInput,
  type SmartMailAccount,
  type SmartMailLinkedEntityType,
  type SmartMailTemplate,
  type SmartMailTemplateType,
  type SmartMailThread,
  smartmailApi,
} from "@/lib/api/modules/smartmail-api";
import { queryKeys } from "@/lib/api/query-keys";
import { env } from "@/lib/env";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Link2, Mail, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const LINKED_ENTITY_TYPES: SmartMailLinkedEntityType[] = [
  "purchase_order",
  "invoice",
  "change_order",
  "subcontractor",
];

const TEMPLATE_TYPES: SmartMailTemplateType[] = ["template", "snippet"];

type SmartMailWorkspaceMode = "inbox" | "templates";

const SMARTMAIL_WORKSPACE_MODE_LABEL: Record<SmartMailWorkspaceMode, string> = {
  inbox: "Inbox operations",
  templates: "Template studio",
};

const SMARTMAIL_WORKSPACE_GUIDE: Record<
  SmartMailWorkspaceMode,
  {
    title: string;
    description: string;
    steps: string[];
  }
> = {
  inbox: {
    title: "Inbox workspace",
    description:
      "Use this workspace to connect accounts, sync mail, and create project threads.",
    steps: [
      "Connect Gmail/Outlook and confirm account status.",
      "Set project ID and sync account messages.",
      "Create and open threads for project communication.",
    ],
  },
  templates: {
    title: "Template studio",
    description:
      "Use this workspace to create shared templates and snippets for faster drafting.",
    steps: [
      "Create reusable templates and snippets.",
      "Update selected templates and variables.",
      "Keep templates aligned with project communication style.",
    ],
  },
};

function toIsoOrUndefined(value: string) {
  if (value.trim().length === 0) {
    return undefined;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return new Date(value).toISOString();
}

function parseCsv(input: string) {
  return input
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseOptionalJson(input: string) {
  const value = input.trim();
  if (value.length === 0) {
    return undefined;
  }

  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON metadata must be an object");
  }

  return parsed as Record<string, unknown>;
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

function AccountCard({
  account,
  onSelect,
  onSync,
}: {
  account: SmartMailAccount;
  onSelect: () => void;
  onSync: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Mail className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {account.email}
          </p>
          <p className="text-xs text-muted-foreground">
            {account.provider} · {account.status} · Last sync{" "}
            {formatDateTime(account.lastSyncAt)}
          </p>
        </div>
      </div>
      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <Button variant="ghost" size="sm" className="h-8" onClick={onSelect}>
          Select
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onSync}
          title="Sync"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function SmartMailPage() {
  const isOutlookOAuthEnabled = env.ENABLE_OUTLOOK_OAUTH;
  const router = useRouter();
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [workspaceMode, setWorkspaceMode] =
    useState<SmartMailWorkspaceMode>("inbox");

  const [createAccountForm, setCreateAccountForm] = useState({
    provider: "gmail" as OAuthProvider,
    email: "",
    defaultProjectId: "",
    autoSyncEnabled: true,
    tokenExpiresAt: "",
    metadataText: "",
  });
  const [updateAccountForm, setUpdateAccountForm] = useState({
    status: "connected" as "connected" | "disconnected" | "error",
    defaultProjectId: "",
    autoSyncEnabled: true,
    tokenExpiresAt: "",
    metadataText: "",
  });
  const [syncMaxResults, setSyncMaxResults] = useState("50");

  const [createThreadForm, setCreateThreadForm] = useState({
    accountId: "",
    subject: "",
    linkedEntityType: "" as SmartMailLinkedEntityType | "",
    linkedEntityId: "",
  });

  const [templateForm, setTemplateForm] = useState({
    name: "",
    type: "template" as SmartMailTemplateType,
    subjectTemplate: "",
    bodyTemplate: "",
    variablesText: "",
    isShared: false,
    metadataText: "",
  });

  const normalizedProjectId = projectId.trim();

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => projectsApi.list(),
  });

  const projectOptions = projectsQuery.data ?? [];

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: queryKeys.smartmailAccounts.list(),
    queryFn: smartmailApi.listAccounts,
  });

  const selectedAccount = useMemo(
    () => (accounts ?? []).find((account) => account.id === selectedAccountId),
    [accounts, selectedAccountId],
  );

  const accountById = useMemo(() => {
    const map = new Map<string, SmartMailAccount>();
    for (const account of accounts ?? []) {
      map.set(account.id, account);
    }
    return map;
  }, [accounts]);

  useEffect(() => {
    if (selectedAccountId.length > 0 || (accounts ?? []).length === 0) {
      return;
    }

    const firstAccountId = accounts?.[0]?.id;
    if (firstAccountId) {
      setSelectedAccountId(firstAccountId);
      setCreateThreadForm((current) => ({
        ...current,
        accountId: firstAccountId,
      }));
    }
  }, [accounts, selectedAccountId.length]);

  useEffect(() => {
    if (!selectedAccount) {
      return;
    }

    setUpdateAccountForm({
      status: selectedAccount.status,
      defaultProjectId: selectedAccount.defaultProjectId ?? "",
      autoSyncEnabled: selectedAccount.autoSyncEnabled,
      tokenExpiresAt: selectedAccount.tokenExpiresAt
        ? selectedAccount.tokenExpiresAt.slice(0, 16)
        : "",
      metadataText: selectedAccount.metadata
        ? JSON.stringify(selectedAccount.metadata, null, 2)
        : "",
    });

    setCreateThreadForm((current) => ({
      ...current,
      accountId: selectedAccount.id,
    }));

    if (!normalizedProjectId && selectedAccount.defaultProjectId) {
      setProjectId(selectedAccount.defaultProjectId);
    }
  }, [normalizedProjectId, selectedAccount]);

  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: queryKeys.smartmailThreads.list({
      projectId: normalizedProjectId,
      accountId: selectedAccountId || undefined,
    }),
    queryFn: () =>
      smartmailApi.listThreads({
        projectId: normalizedProjectId,
        accountId: selectedAccountId || undefined,
      }),
    enabled: normalizedProjectId.length > 0,
  });

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: queryKeys.smartmailTemplates.list({
      projectId: normalizedProjectId || undefined,
    }),
    queryFn: () =>
      smartmailApi.listTemplates({
        projectId: normalizedProjectId || undefined,
      }),
  });

  const selectedTemplate = useMemo(
    () =>
      (templates ?? []).find((template) => template.id === selectedTemplateId),
    [selectedTemplateId, templates],
  );

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    setTemplateForm({
      name: selectedTemplate.name,
      type: selectedTemplate.type,
      subjectTemplate: selectedTemplate.subjectTemplate,
      bodyTemplate: selectedTemplate.bodyTemplate,
      variablesText: selectedTemplate.variables.join(", "),
      isShared: selectedTemplate.isShared,
      metadataText: selectedTemplate.metadata
        ? JSON.stringify(selectedTemplate.metadata, null, 2)
        : "",
    });
  }, [selectedTemplate]);

  const oauthConnectMutation = useMutation({
    mutationFn: async (provider: OAuthProvider) => {
      if (provider === "gmail") {
        return await oauthApi.getGmailAuthUrl();
      }

      return await oauthApi.getOutlookAuthUrl();
    },
    onSuccess: (result, provider) => {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("smartmail.oauth.provider", provider);
        window.sessionStorage.setItem(
          "smartmail.oauth.returnPath",
          "/smartmail",
        );
        window.location.assign(result.authUrl);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: () =>
      smartmailApi.createAccount({
        provider: createAccountForm.provider,
        email: createAccountForm.email.trim(),
        defaultProjectId:
          createAccountForm.defaultProjectId.trim() || undefined,
        autoSyncEnabled: createAccountForm.autoSyncEnabled,
        tokenExpiresAt: toIsoOrUndefined(createAccountForm.tokenExpiresAt),
        metadata: parseOptionalJson(createAccountForm.metadataText),
      }),
    onSuccess: (account) => {
      toast.success("SmartMail account created");
      setSelectedAccountId(account.id);
      setCreateAccountForm((current) => ({
        ...current,
        email: "",
        tokenExpiresAt: "",
        metadataText: "",
      }));
      void qc.invalidateQueries({ queryKey: queryKeys.smartmailAccounts.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: () => {
      if (!selectedAccountId) {
        throw new Error("Select an account first");
      }

      return smartmailApi.updateAccount(selectedAccountId, {
        status: updateAccountForm.status,
        defaultProjectId:
          updateAccountForm.defaultProjectId.trim() || undefined,
        autoSyncEnabled: updateAccountForm.autoSyncEnabled,
        tokenExpiresAt: toIsoOrUndefined(updateAccountForm.tokenExpiresAt),
        metadata: parseOptionalJson(updateAccountForm.metadataText),
      });
    },
    onSuccess: () => {
      toast.success("SmartMail account updated");
      void qc.invalidateQueries({ queryKey: queryKeys.smartmailAccounts.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const syncMutation = useMutation({
    mutationFn: (accountId: string) =>
      smartmailApi.syncAccount(accountId, {
        projectId: normalizedProjectId || undefined,
        maxResults: Number.parseInt(syncMaxResults, 10) || 50,
      }),
    onSuccess: () => {
      toast.success("Sync completed");
      void qc.invalidateQueries({ queryKey: queryKeys.smartmailAccounts.all });
      void qc.invalidateQueries({ queryKey: queryKeys.smartmailThreads.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: () => {
      if (!normalizedProjectId) {
        throw new Error("Project ID is required to create a thread");
      }

      const accountId = createThreadForm.accountId || selectedAccountId;
      if (!accountId) {
        throw new Error("Account ID is required to create a thread");
      }

      return smartmailApi.createThread({
        projectId: normalizedProjectId,
        accountId,
        subject: createThreadForm.subject.trim(),
        linkedEntityType:
          createThreadForm.linkedEntityType === ""
            ? undefined
            : createThreadForm.linkedEntityType,
        linkedEntityId: createThreadForm.linkedEntityId.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Thread created");
      setCreateThreadForm((current) => ({
        ...current,
        subject: "",
        linkedEntityType: "",
        linkedEntityId: "",
      }));
      void qc.invalidateQueries({ queryKey: queryKeys.smartmailThreads.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: () => {
      const payload: CreateSmartMailTemplateInput = {
        projectId: normalizedProjectId || undefined,
        name: templateForm.name.trim(),
        type: templateForm.type,
        subjectTemplate: templateForm.subjectTemplate,
        bodyTemplate: templateForm.bodyTemplate,
        variables: parseCsv(templateForm.variablesText),
        isShared: templateForm.isShared,
        metadata: parseOptionalJson(templateForm.metadataText),
      };

      return smartmailApi.createTemplate(payload);
    },
    onSuccess: () => {
      toast.success("Template created");
      setTemplateForm((current) => ({
        ...current,
        name: "",
        subjectTemplate: "",
        bodyTemplate: "",
        variablesText: "",
        metadataText: "",
      }));
      void qc.invalidateQueries({ queryKey: queryKeys.smartmailTemplates.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: () => {
      if (!selectedTemplateId) {
        throw new Error("Select a template first");
      }

      return smartmailApi.updateTemplate(selectedTemplateId, {
        name: templateForm.name.trim(),
        subjectTemplate: templateForm.subjectTemplate,
        bodyTemplate: templateForm.bodyTemplate,
        variables: parseCsv(templateForm.variablesText),
        isShared: templateForm.isShared,
        metadata: parseOptionalJson(templateForm.metadataText),
      });
    },
    onSuccess: () => {
      toast.success("Template updated");
      void qc.invalidateQueries({ queryKey: queryKeys.smartmailTemplates.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) => smartmailApi.deleteTemplate(templateId),
    onSuccess: () => {
      toast.success("Template deleted");
      setSelectedTemplateId("");
      void qc.invalidateQueries({ queryKey: queryKeys.smartmailTemplates.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const accountColumns: DataTableColumn<SmartMailAccount>[] = [
    {
      key: "account",
      header: "Account",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{row.email}</p>
          <p className="text-xs text-muted-foreground">{row.provider}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "170px",
      render: (row) => (
        <div>
          <p className="text-sm text-foreground">{row.status}</p>
          <p className="text-xs text-muted-foreground">{row.lastSyncStatus}</p>
        </div>
      ),
    },
    {
      key: "synced",
      header: "Last Sync",
      width: "220px",
      render: (row) => (
        <p className="text-xs text-muted-foreground">
          {formatDateTime(row.lastSyncAt)}
        </p>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "110px",
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={(event) => {
            event.stopPropagation();
            syncMutation.mutate(row.id);
          }}
          disabled={syncMutation.isPending}
        >
          Sync
        </Button>
      ),
    },
  ];

  const threadColumns: DataTableColumn<SmartMailThread>[] = [
    {
      key: "subject",
      header: "Thread",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{row.subject}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {row.participants.join(", ") || "No participants"}
          </p>
        </div>
      ),
    },
    {
      key: "account",
      header: "Account",
      width: "260px",
      render: (row) => (
        <p className="truncate text-xs text-muted-foreground">
          {accountById.get(row.accountId)?.email ?? row.accountId}
        </p>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      width: "200px",
      render: (row) => (
        <p className="text-xs text-muted-foreground">
          {formatDateTime(row.lastMessageAt ?? row.updatedAt)}
        </p>
      ),
    },
  ];

  const templateColumns: DataTableColumn<SmartMailTemplate>[] = [
    {
      key: "name",
      header: "Template",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.type}</p>
        </div>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      width: "200px",
      render: (row) => (
        <p className="truncate text-xs text-muted-foreground">
          {row.projectId ?? "Org shared"}
        </p>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      width: "220px",
      render: (row) => (
        <p className="text-xs text-muted-foreground">
          {formatDateTime(row.updatedAt)}
        </p>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "100px",
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-destructive"
          onClick={(event) => {
            event.stopPropagation();
            if (window.confirm("Delete this template?")) {
              deleteTemplateMutation.mutate(row.id);
            }
          }}
          disabled={deleteTemplateMutation.isPending}
        >
          Delete
        </Button>
      ),
    },
  ];

  const hasAccounts = (accounts ?? []).length > 0;
  const showInbox = workspaceMode === "inbox";
  const showSetup = showInbox;
  const showThreads = showInbox;
  const showTemplates = workspaceMode === "templates";
  const showAccountStrip = showInbox;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="SmartMail"
        description="Connect your inbox and track project-related communications."
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => oauthConnectMutation.mutate("gmail")}
              disabled={oauthConnectMutation.isPending}
            >
              <Link2 className="mr-1.5 h-4 w-4" />
              Connect Gmail
            </Button>
            {isOutlookOAuthEnabled ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => oauthConnectMutation.mutate("outlook")}
                disabled={oauthConnectMutation.isPending}
              >
                <Link2 className="mr-1.5 h-4 w-4" />
                Connect Outlook
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" asChild>
              <Link href="/integrations">
                Manage Integrations
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Workflow focus
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Switch between inbox operations and template studio to keep
              SmartMail workflows focused.
            </p>
          </div>
          <div>
            <Label htmlFor="smartmail-workflow-focus">Focus mode</Label>
            <Select
              id="smartmail-workflow-focus"
              value={workspaceMode}
              onChange={(event) =>
                setWorkspaceMode(event.target.value as SmartMailWorkspaceMode)
              }
            >
              {(
                Object.keys(
                  SMARTMAIL_WORKSPACE_MODE_LABEL,
                ) as SmartMailWorkspaceMode[]
              ).map((mode) => (
                <option key={mode} value={mode}>
                  {SMARTMAIL_WORKSPACE_MODE_LABEL[mode]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-medium text-foreground">
            {SMARTMAIL_WORKSPACE_GUIDE[workspaceMode].title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {SMARTMAIL_WORKSPACE_GUIDE[workspaceMode].description}
          </p>
          <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
            {SMARTMAIL_WORKSPACE_GUIDE[workspaceMode].steps.map((step) => (
              <p
                key={step}
                className="rounded-md bg-background/80 px-3 py-2"
              >
                {step}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_220px]">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="smartmail-project-id">Project ID</Label>
            <RadixSelect
              value={projectId || undefined}
              onValueChange={(value) => setProjectId(value)}
            >
              <SelectTrigger id="smartmail-project-id" className="h-10">
                <SelectValue
                  placeholder={
                    projectsQuery.isLoading
                      ? "Loading projects..."
                      : "Select project"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {projectId &&
                  !projectOptions.some((project) => project.id === projectId) && (
                    <SelectItem value={projectId}>Current: {projectId}</SelectItem>
                  )}
                {projectOptions.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </RadixSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smartmail-sync-max">Sync max results</Label>
            <Input
              id="smartmail-sync-max"
              inputMode="numeric"
              value={syncMaxResults}
              onChange={(event) => setSyncMaxResults(event.target.value)}
            />
          </div>
        </div>
      </section>

      {showAccountStrip &&
        (accountsLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : (accounts ?? []).length > 0 ? (
          <div className="space-y-2">
            {(accounts ?? []).map((acct) => (
              <AccountCard
                key={acct.id}
                account={acct}
                onSelect={() => setSelectedAccountId(acct.id)}
                onSync={() => syncMutation.mutate(acct.id)}
              />
            ))}
          </div>
        ) : null)}

      {showSetup && (
        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">
              Create account
            </h2>
            <div className="mt-3 grid gap-3">
              <Select
                value={createAccountForm.provider}
                onChange={(event) =>
                  setCreateAccountForm((current) => ({
                    ...current,
                    provider: event.target.value as OAuthProvider,
                  }))
                }
              >
                <option value="gmail">gmail</option>
                {isOutlookOAuthEnabled ? (
                  <option value="outlook">outlook</option>
                ) : null}
              </Select>
              <Input
                placeholder="Account email"
                type="email"
                value={createAccountForm.email}
                onChange={(event) =>
                  setCreateAccountForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Default project ID"
                value={createAccountForm.defaultProjectId}
                onChange={(event) =>
                  setCreateAccountForm((current) => ({
                    ...current,
                    defaultProjectId: event.target.value,
                  }))
                }
              />
              <Input
                type="datetime-local"
                value={createAccountForm.tokenExpiresAt}
                onChange={(event) =>
                  setCreateAccountForm((current) => ({
                    ...current,
                    tokenExpiresAt: event.target.value,
                  }))
                }
              />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={createAccountForm.autoSyncEnabled}
                  onChange={(event) =>
                    setCreateAccountForm((current) => ({
                      ...current,
                      autoSyncEnabled: event.target.checked,
                    }))
                  }
                />
                Auto sync enabled
              </label>
              <textarea
                className="flex min-h-[92px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                placeholder="Metadata JSON (optional)"
                value={createAccountForm.metadataText}
                onChange={(event) =>
                  setCreateAccountForm((current) => ({
                    ...current,
                    metadataText: event.target.value,
                  }))
                }
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => createAccountMutation.mutate()}
                  disabled={createAccountMutation.isPending}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create account
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">
              Update selected account
            </h2>
            {!selectedAccount ? (
              <EmptyState
                title="No account selected"
                description="Select an account from the list to edit status and sync settings."
                className="border-none"
              />
            ) : (
              <div className="mt-3 grid gap-3">
                <p className="text-xs text-muted-foreground">
                  {selectedAccount.email} ({selectedAccount.provider})
                </p>
                <Select
                  value={updateAccountForm.status}
                  onChange={(event) =>
                    setUpdateAccountForm((current) => ({
                      ...current,
                      status: event.target.value as
                        | "connected"
                        | "disconnected"
                        | "error",
                    }))
                  }
                >
                  <option value="connected">connected</option>
                  <option value="disconnected">disconnected</option>
                  <option value="error">error</option>
                </Select>
                <Input
                  placeholder="Default project ID"
                  value={updateAccountForm.defaultProjectId}
                  onChange={(event) =>
                    setUpdateAccountForm((current) => ({
                      ...current,
                      defaultProjectId: event.target.value,
                    }))
                  }
                />
                <Input
                  type="datetime-local"
                  value={updateAccountForm.tokenExpiresAt}
                  onChange={(event) =>
                    setUpdateAccountForm((current) => ({
                      ...current,
                      tokenExpiresAt: event.target.value,
                    }))
                  }
                />
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={updateAccountForm.autoSyncEnabled}
                    onChange={(event) =>
                      setUpdateAccountForm((current) => ({
                        ...current,
                        autoSyncEnabled: event.target.checked,
                      }))
                    }
                  />
                  Auto sync enabled
                </label>
                <textarea
                  className="flex min-h-[92px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  placeholder="Metadata JSON (optional)"
                  value={updateAccountForm.metadataText}
                  onChange={(event) =>
                    setUpdateAccountForm((current) => ({
                      ...current,
                      metadataText: event.target.value,
                    }))
                  }
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => syncMutation.mutate(selectedAccount.id)}
                    disabled={syncMutation.isPending}
                  >
                    Sync now
                  </Button>
                  <Button
                    onClick={() => updateAccountMutation.mutate()}
                    disabled={updateAccountMutation.isPending}
                  >
                    Save account
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {showSetup && (
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Accounts</h2>
          <DataTable
            className="w-full border-none [&_table]:w-full [&_table]:table-fixed"
            columns={accountColumns}
            data={accounts ?? []}
            rowKey={(row) => row.id}
            onRowClick={(row) => setSelectedAccountId(row.id)}
            emptyState={
              <EmptyState
                icon={Mail}
                title="No accounts"
                description="Create an account manually or connect via OAuth to begin syncing messages."
                className="border-none"
              />
            }
          />
        </section>
      )}

      {showThreads && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Create thread
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Select
              value={createThreadForm.accountId}
              onChange={(event) =>
                setCreateThreadForm((current) => ({
                  ...current,
                  accountId: event.target.value,
                }))
              }
            >
              <option value="">Select account</option>
              {(accounts ?? []).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.email}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Thread subject"
              value={createThreadForm.subject}
              onChange={(event) =>
                setCreateThreadForm((current) => ({
                  ...current,
                  subject: event.target.value,
                }))
              }
            />
            <Select
              value={createThreadForm.linkedEntityType}
              onChange={(event) =>
                setCreateThreadForm((current) => ({
                  ...current,
                  linkedEntityType: event.target.value as
                    | SmartMailLinkedEntityType
                    | "",
                }))
              }
            >
              <option value="">No linked entity</option>
              {LINKED_ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Linked entity ID"
              value={createThreadForm.linkedEntityId}
              onChange={(event) =>
                setCreateThreadForm((current) => ({
                  ...current,
                  linkedEntityId: event.target.value,
                }))
              }
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              className="w-full sm:w-auto"
              onClick={() => createThreadMutation.mutate()}
              disabled={createThreadMutation.isPending || !normalizedProjectId}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create thread
            </Button>
          </div>
        </section>
      )}

      {showTemplates && (
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Templates</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Template name"
              value={templateForm.name}
              onChange={(event) =>
                setTemplateForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
            <Select
              value={templateForm.type}
              onChange={(event) =>
                setTemplateForm((current) => ({
                  ...current,
                  type: event.target.value as SmartMailTemplateType,
                }))
              }
            >
              {TEMPLATE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Subject template"
              value={templateForm.subjectTemplate}
              onChange={(event) =>
                setTemplateForm((current) => ({
                  ...current,
                  subjectTemplate: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Variables (comma-separated)"
              value={templateForm.variablesText}
              onChange={(event) =>
                setTemplateForm((current) => ({
                  ...current,
                  variablesText: event.target.value,
                }))
              }
            />
            <textarea
              className="md:col-span-2 flex min-h-[84px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              placeholder="Body template"
              value={templateForm.bodyTemplate}
              onChange={(event) =>
                setTemplateForm((current) => ({
                  ...current,
                  bodyTemplate: event.target.value,
                }))
              }
            />
            <textarea
              className="md:col-span-2 flex min-h-[84px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              placeholder="Metadata JSON (optional)"
              value={templateForm.metadataText}
              onChange={(event) =>
                setTemplateForm((current) => ({
                  ...current,
                  metadataText: event.target.value,
                }))
              }
            />
            <label className="md:col-span-2 flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={templateForm.isShared}
                onChange={(event) =>
                  setTemplateForm((current) => ({
                    ...current,
                    isShared: event.target.checked,
                  }))
                }
              />
              Shared template
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => createTemplateMutation.mutate()}
              disabled={createTemplateMutation.isPending}
            >
              Create template
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => updateTemplateMutation.mutate()}
              disabled={updateTemplateMutation.isPending || !selectedTemplateId}
            >
              Update selected
            </Button>
          </div>

          {templatesLoading ? (
            <Skeleton className="h-28 w-full rounded-xl" />
          ) : (
            <DataTable
              className="w-full border-none [&_table]:w-full [&_table]:table-fixed"
              columns={templateColumns}
              data={templates ?? []}
              rowKey={(row) => row.id}
              onRowClick={(row) => setSelectedTemplateId(row.id)}
              emptyState={
                <EmptyState
                  icon={Mail}
                  title="No templates"
                  description="Create a template or snippet for draft generation."
                  className="border-none"
                />
              }
            />
          )}
        </section>
      )}

      {showThreads && (
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Threads</h2>
          {normalizedProjectId.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="Project required"
              description="Select a project to load SmartMail threads."
              className="border-none"
            />
          ) : threadsLoading ? (
            <Skeleton className="h-28 w-full rounded-xl" />
          ) : (
            <DataTable
              className="w-full border-none [&_table]:w-full [&_table]:table-fixed"
              columns={threadColumns}
              data={threads ?? []}
              rowKey={(row) => row.id}
              onRowClick={(row) => {
                const params = new URLSearchParams();
                params.set("projectId", normalizedProjectId);
                params.set("accountId", row.accountId);
                router.push(`/smartmail/${row.id}?${params.toString()}`);
              }}
              emptyState={
                <EmptyState
                  icon={Mail}
                  title="No threads"
                  description="Create or sync threads for this project."
                  className="border-none"
                />
              }
            />
          )}
        </section>
      )}

      {!hasAccounts && (showSetup || showThreads) && (
        <EmptyState
          icon={Mail}
          title="No accounts connected"
          description="Connect Gmail or Outlook to unlock thread, compose, and AI draft workflows."
        />
      )}
    </div>
  );
}
