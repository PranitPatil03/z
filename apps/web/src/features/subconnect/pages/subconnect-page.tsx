"use client";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  complianceHealth,
  formatCents,
  formatDateTime,
  parseCommaSeparated,
  riskLevelFromScoreBps,
  toIsoOrUndefined,
} from "@/features/subconnect/lib/subconnect-utils";
import { ApiRequestError } from "@/lib/api/http-client";
import {
  type ComplianceItem,
  type ComplianceStatus,
  type ComplianceTemplate,
  type DailyLog,
  type DailyLogDetail,
  type DailyLogReviewStatus,
  type InviteSubcontractorPortalResult,
  type PayApplication,
  type PayApplicationDetail,
  type PayApplicationStatus,
  type Subcontractor,
  type SubcontractorStatus,
  subconnectApi,
} from "@/lib/api/modules/subconnect-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function parseMetadataText(input: string) {
  const value = input.trim();
  if (value.length === 0) {
    return undefined;
  }

  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Metadata must be a JSON object");
  }

  return parsed as Record<string, unknown>;
}

async function getLatestScoreSafe(subcontractorId: string) {
  try {
    return await subconnectApi.getLatestPrequalificationScore(subcontractorId);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

function formatPercentBps(value: number) {
  return `${(value / 100).toFixed(1)}%`;
}

type SubconnectWorkspaceMode = "onboarding" | "operations";

const SUBCONNECT_WORKSPACE_MODE_LABEL: Record<SubconnectWorkspaceMode, string> =
  {
    onboarding: "Onboarding",
    operations: "Compliance + financial",
  };

const SUBCONNECT_WORKSPACE_GUIDE: Record<
  SubconnectWorkspaceMode,
  {
    title: string;
    description: string;
    steps: string[];
  }
> = {
  onboarding: {
    title: "Onboarding workspace",
    description:
      "Use this workspace to add subcontractors, update their profile, and manage invites.",
    steps: [
      "Create subcontractor records.",
      "Update selected subcontractor details.",
      "Send portal invites and monitor invitation history.",
    ],
  },
  operations: {
    title: "Operations workspace",
    description:
      "Use this workspace for compliance checks, pay application review, and daily log review.",
    steps: [
      "Manage compliance templates and complete compliance item reviews.",
      "Review pay applications and approve or reject submissions.",
      "Process daily logs and finalize field review decisions.",
    ],
  },
};

export function SubconnectPage() {
  const queryClient = useQueryClient();

  const [projectId, setProjectId] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubcontractorStatus | "">(
    "",
  );
  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedComplianceItemId, setSelectedComplianceItemId] = useState("");
  const [selectedPayApplicationId, setSelectedPayApplicationId] = useState("");
  const [selectedDailyLogId, setSelectedDailyLogId] = useState("");
  const [workspaceMode, setWorkspaceMode] =
    useState<SubconnectWorkspaceMode>("onboarding");

  const [createSubcontractorForm, setCreateSubcontractorForm] = useState({
    projectId: "",
    name: "",
    email: "",
    phone: "",
    trade: "",
    metadataText: "",
  });

  const [editSubcontractorForm, setEditSubcontractorForm] = useState({
    projectId: "",
    name: "",
    email: "",
    phone: "",
    trade: "",
    status: "active" as SubcontractorStatus,
    metadataText: "",
  });

  const [inviteForm, setInviteForm] = useState({
    email: "",
    projectId: "",
    temporaryPassword: "",
    assignedScope: "",
    milestonesText: "",
    sendInviteEmail: true,
  });

  const [templateForm, setTemplateForm] = useState({
    name: "",
    complianceType: "",
    defaultDueDays: "30",
    required: true,
    highRisk: false,
    metadataText: "",
  });
  const [applyDueDateOverride, setApplyDueDateOverride] = useState("");

  const [scoreForm, setScoreForm] = useState({
    overallScoreBps: "7000",
    safetyScoreBps: "",
    financialScoreBps: "",
    complianceScoreBps: "",
    capacityScoreBps: "",
    modelVersion: "v1",
    notes: "",
    metadataText: "",
  });

  const [createComplianceForm, setCreateComplianceForm] = useState({
    complianceType: "",
    highRisk: false,
    dueDate: "",
    notes: "",
    evidenceText: "",
  });

  const [reviewComplianceForm, setReviewComplianceForm] = useState({
    status: "pending" as ComplianceStatus,
    highRisk: false,
    reviewerConfirmed: false,
    dueDate: "",
    notes: "",
    evidenceText: "",
  });

  const [extractionForm, setExtractionForm] = useState({
    prompt: "",
    sourceFileName: "",
    sourceUrl: "",
    provider: "openai" as "openai" | "anthropic" | "gemini" | "azure-openai",
    model: "",
  });

  const [payReviewForm, setPayReviewForm] = useState({
    status: "under_review" as "under_review" | "approved" | "rejected" | "paid",
    reason: "",
    reviewerNotes: "",
    metadataText: "",
  });

  const [dailyReviewForm, setDailyReviewForm] = useState({
    reviewStatus: "reviewed" as "reviewed" | "rejected",
    reviewNotes: "",
    metadataText: "",
  });

  const [lastInviteResult, setLastInviteResult] =
    useState<InviteSubcontractorPortalResult | null>(null);

  const normalizedProjectId = projectId.trim();

  const subcontractorsQuery = useQuery({
    queryKey: queryKeys.subcontractors.list({
      projectId: normalizedProjectId || undefined,
      status: statusFilter || undefined,
      includeComplianceSummary: true,
    }),
    queryFn: () =>
      subconnectApi.listSubcontractors({
        projectId: normalizedProjectId || undefined,
        status: statusFilter || undefined,
        includeComplianceSummary: true,
      }),
  });

  const invitationsQuery = useQuery({
    queryKey: queryKeys.subconnect.invitations({
      projectId: normalizedProjectId || undefined,
      limit: 50,
    }),
    queryFn: () =>
      subconnectApi.listInvitations({
        projectId: normalizedProjectId || undefined,
        limit: 50,
      }),
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.subconnect.complianceTemplates(normalizedProjectId),
    queryFn: () => subconnectApi.listComplianceTemplates(normalizedProjectId),
    enabled: normalizedProjectId.length > 0,
  });

  const complianceItemsQuery = useQuery({
    queryKey: queryKeys.compliance.list({
      projectId: normalizedProjectId || undefined,
    }),
    queryFn: () =>
      subconnectApi.listComplianceItems({
        projectId: normalizedProjectId || undefined,
      }),
  });

  const prequalificationQuery = useQuery({
    queryKey: queryKeys.subconnect.prequalification(selectedSubcontractorId),
    queryFn: () => getLatestScoreSafe(selectedSubcontractorId),
    enabled: selectedSubcontractorId.length > 0,
    retry: false,
  });

  const payApplicationsQuery = useQuery({
    queryKey: queryKeys.subconnect.payApplications({
      projectId: normalizedProjectId || undefined,
      limit: 100,
    }),
    queryFn: () =>
      subconnectApi.listPayApplications({
        projectId: normalizedProjectId || undefined,
        limit: 100,
      }),
  });

  const payApplicationDetailQuery = useQuery({
    queryKey: queryKeys.subconnect.payApplicationDetail(
      selectedPayApplicationId,
    ),
    queryFn: () => subconnectApi.getPayApplication(selectedPayApplicationId),
    enabled: selectedPayApplicationId.length > 0,
  });

  const dailyLogsQuery = useQuery({
    queryKey: queryKeys.subconnect.dailyLogs({
      projectId: normalizedProjectId || undefined,
      limit: 100,
    }),
    queryFn: () =>
      subconnectApi.listDailyLogs({
        projectId: normalizedProjectId || undefined,
        limit: 100,
      }),
  });

  const dailyLogDetailQuery = useQuery({
    queryKey: queryKeys.subconnect.dailyLogDetail(selectedDailyLogId),
    queryFn: () => subconnectApi.getDailyLog(selectedDailyLogId),
    enabled: selectedDailyLogId.length > 0,
  });

  const selectedSubcontractor = useMemo(
    () =>
      (subcontractorsQuery.data ?? []).find(
        (item) => item.id === selectedSubcontractorId,
      ) ?? null,
    [subcontractorsQuery.data, selectedSubcontractorId],
  );

  const selectedTemplate = useMemo(
    () =>
      (templatesQuery.data ?? []).find(
        (item) => item.id === selectedTemplateId,
      ) ?? null,
    [templatesQuery.data, selectedTemplateId],
  );

  const selectedComplianceItem = useMemo(
    () =>
      (complianceItemsQuery.data ?? []).find(
        (item) => item.id === selectedComplianceItemId,
      ) ?? null,
    [complianceItemsQuery.data, selectedComplianceItemId],
  );

  const selectedPayApplication = payApplicationDetailQuery.data ?? null;
  const selectedDailyLog = dailyLogDetailQuery.data ?? null;

  useEffect(() => {
    const first = subcontractorsQuery.data?.[0];
    if (!first) {
      return;
    }

    if (selectedSubcontractorId.length === 0) {
      setSelectedSubcontractorId(first.id);
    }
  }, [selectedSubcontractorId.length, subcontractorsQuery.data]);

  useEffect(() => {
    if (!selectedSubcontractor) {
      return;
    }

    setEditSubcontractorForm({
      projectId: selectedSubcontractor.projectId ?? "",
      name: selectedSubcontractor.name,
      email: selectedSubcontractor.email ?? "",
      phone: selectedSubcontractor.phone ?? "",
      trade: selectedSubcontractor.trade,
      status: selectedSubcontractor.status,
      metadataText: selectedSubcontractor.metadata
        ? JSON.stringify(selectedSubcontractor.metadata, null, 2)
        : "",
    });

    setInviteForm((current) => ({
      ...current,
      email: selectedSubcontractor.email ?? current.email,
      projectId:
        selectedSubcontractor.projectId ??
        (normalizedProjectId || current.projectId),
    }));
  }, [normalizedProjectId, selectedSubcontractor]);

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    setTemplateForm({
      name: selectedTemplate.name,
      complianceType: selectedTemplate.complianceType,
      defaultDueDays: String(selectedTemplate.defaultDueDays),
      required: selectedTemplate.required,
      highRisk: selectedTemplate.highRisk,
      metadataText: selectedTemplate.metadata
        ? JSON.stringify(selectedTemplate.metadata, null, 2)
        : "",
    });
  }, [selectedTemplate]);

  useEffect(() => {
    if (!selectedComplianceItem) {
      return;
    }

    setReviewComplianceForm({
      status: selectedComplianceItem.status,
      highRisk: selectedComplianceItem.highRisk,
      reviewerConfirmed: Boolean(selectedComplianceItem.reviewerConfirmedAt),
      dueDate: selectedComplianceItem.dueDate
        ? new Date(selectedComplianceItem.dueDate).toISOString().slice(0, 16)
        : "",
      notes: selectedComplianceItem.notes ?? "",
      evidenceText: selectedComplianceItem.evidence
        ? JSON.stringify(selectedComplianceItem.evidence, null, 2)
        : "",
    });
  }, [selectedComplianceItem]);

  useEffect(() => {
    if (!selectedPayApplication) {
      return;
    }

    setPayReviewForm((current) => ({
      ...current,
      status:
        selectedPayApplication.status === "draft" ||
        selectedPayApplication.status === "submitted"
          ? "under_review"
          : selectedPayApplication.status,
      reason: selectedPayApplication.rejectionReason ?? "",
    }));
  }, [selectedPayApplication]);

  useEffect(() => {
    if (!selectedDailyLog) {
      return;
    }

    setDailyReviewForm((current) => ({
      ...current,
      reviewStatus:
        selectedDailyLog.reviewStatus === "pending"
          ? "reviewed"
          : selectedDailyLog.reviewStatus,
      reviewNotes: selectedDailyLog.reviewNotes ?? "",
    }));
  }, [selectedDailyLog]);

  function refreshM8() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.subcontractors.all,
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.subconnect.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.all });
  }

  const createSubcontractorMutation = useMutation({
    mutationFn: () =>
      subconnectApi.createSubcontractor({
        projectId: createSubcontractorForm.projectId.trim() || undefined,
        name: createSubcontractorForm.name.trim(),
        email: createSubcontractorForm.email.trim() || undefined,
        phone: createSubcontractorForm.phone.trim() || undefined,
        trade: createSubcontractorForm.trade.trim(),
        metadata: parseMetadataText(createSubcontractorForm.metadataText),
      }),
    onSuccess: (record) => {
      toast.success("Subcontractor created");
      setSelectedSubcontractorId(record.id);
      setCreateSubcontractorForm((current) => ({
        ...current,
        name: "",
        email: "",
        phone: "",
        trade: "",
        metadataText: "",
      }));
      refreshM8();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateSubcontractorMutation = useMutation({
    mutationFn: () => {
      if (!selectedSubcontractorId) {
        throw new Error("Select a subcontractor first");
      }

      return subconnectApi.updateSubcontractor(selectedSubcontractorId, {
        projectId: editSubcontractorForm.projectId.trim() || undefined,
        name: editSubcontractorForm.name.trim(),
        email: editSubcontractorForm.email.trim() || undefined,
        phone: editSubcontractorForm.phone.trim() || undefined,
        trade: editSubcontractorForm.trade.trim(),
        status: editSubcontractorForm.status,
        metadata: parseMetadataText(editSubcontractorForm.metadataText),
      });
    },
    onSuccess: () => {
      toast.success("Subcontractor updated");
      refreshM8();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const archiveSubcontractorMutation = useMutation({
    mutationFn: (subcontractorId: string) =>
      subconnectApi.archiveSubcontractor(subcontractorId),
    onSuccess: () => {
      toast.success("Subcontractor archived");
      refreshM8();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const inviteMutation = useMutation({
    mutationFn: () => {
      if (!selectedSubcontractorId) {
        throw new Error("Select a subcontractor first");
      }

      return subconnectApi.inviteSubcontractorPortal(selectedSubcontractorId, {
        email: inviteForm.email.trim() || undefined,
        projectId: inviteForm.projectId.trim() || undefined,
        temporaryPassword: inviteForm.temporaryPassword.trim() || undefined,
        assignedScope: inviteForm.assignedScope.trim() || undefined,
        milestones: parseCommaSeparated(inviteForm.milestonesText),
        sendInviteEmail: inviteForm.sendInviteEmail,
      });
    },
    onSuccess: (result) => {
      toast.success("Portal invitation created");
      setLastInviteResult(result);
      refreshM8();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createTemplateMutation = useMutation({
    mutationFn: () => {
      if (!normalizedProjectId) {
        throw new Error("Project ID is required for templates");
      }

      return subconnectApi.createComplianceTemplate({
        projectId: normalizedProjectId,
        name: templateForm.name.trim(),
        complianceType: templateForm.complianceType.trim(),
        defaultDueDays: Number.parseInt(templateForm.defaultDueDays, 10),
        required: templateForm.required,
        highRisk: templateForm.highRisk,
        metadata: parseMetadataText(templateForm.metadataText),
      });
    },
    onSuccess: (record) => {
      toast.success("Template created");
      setSelectedTemplateId(record.id);
      refreshM8();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: () => {
      if (!selectedTemplateId) {
        throw new Error("Select a template first");
      }

      return subconnectApi.updateComplianceTemplate(selectedTemplateId, {
        name: templateForm.name.trim(),
        complianceType: templateForm.complianceType.trim(),
        defaultDueDays: Number.parseInt(templateForm.defaultDueDays, 10),
        required: templateForm.required,
        highRisk: templateForm.highRisk,
        metadata: parseMetadataText(templateForm.metadataText),
      });
    },
    onSuccess: () => {
      toast.success("Template updated");
      refreshM8();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const archiveTemplateMutation = useMutation({
    mutationFn: (templateId: string) =>
      subconnectApi.archiveComplianceTemplate(templateId),
    onSuccess: () => {
      toast.success("Template archived");
      refreshM8();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const applyTemplatesMutation = useMutation({
    mutationFn: () => {
      if (!normalizedProjectId) {
        throw new Error("Project ID is required");
      }
      if (!selectedSubcontractorId) {
        throw new Error("Select a subcontractor first");
      }

      return subconnectApi.applyComplianceTemplates({
        projectId: normalizedProjectId,
        subcontractorId: selectedSubcontractorId,
        dueDateOverride: toIsoOrUndefined(applyDueDateOverride),
      });
    },
    onSuccess: (result) => {
      toast.success(`Applied templates: ${result.created} item(s) created`);
      refreshM8();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const upsertScoreMutation = useMutation({
    mutationFn: () => {
      if (!selectedSubcontractorId) {
        throw new Error("Select a subcontractor first");
      }

      const overallScoreBps = Number.parseInt(scoreForm.overallScoreBps, 10);
      if (!Number.isFinite(overallScoreBps)) {
        throw new Error("Overall score is required");
      }

      return subconnectApi.upsertPrequalificationScore({
        subcontractorId: selectedSubcontractorId,
        projectId: normalizedProjectId || undefined,
        overallScoreBps,
        safetyScoreBps: scoreForm.safetyScoreBps
          ? Number.parseInt(scoreForm.safetyScoreBps, 10)
          : undefined,
        financialScoreBps: scoreForm.financialScoreBps
          ? Number.parseInt(scoreForm.financialScoreBps, 10)
          : undefined,
        complianceScoreBps: scoreForm.complianceScoreBps
          ? Number.parseInt(scoreForm.complianceScoreBps, 10)
          : undefined,
        capacityScoreBps: scoreForm.capacityScoreBps
          ? Number.parseInt(scoreForm.capacityScoreBps, 10)
          : undefined,
        riskLevel: riskLevelFromScoreBps(overallScoreBps),
        modelVersion: scoreForm.modelVersion.trim() || "v1",
        notes: scoreForm.notes.trim() || undefined,
        metadata: parseMetadataText(scoreForm.metadataText),
      });
    },
    onSuccess: () => {
      toast.success("Prequalification score saved");
      refreshM8();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createComplianceItemMutation = useMutation({
    mutationFn: () => {
      if (!normalizedProjectId) {
        throw new Error("Project ID is required for compliance items");
      }

      return subconnectApi.createComplianceItem({
        projectId: normalizedProjectId,
        subcontractorId: selectedSubcontractorId || undefined,
        complianceType: createComplianceForm.complianceType.trim(),
        highRisk: createComplianceForm.highRisk,
        dueDate: toIsoOrUndefined(createComplianceForm.dueDate),
        notes: createComplianceForm.notes.trim() || undefined,
        evidence: parseMetadataText(createComplianceForm.evidenceText),
      });
    },
    onSuccess: (record) => {
      toast.success("Compliance item created");
      setSelectedComplianceItemId(record.id);
      setCreateComplianceForm({
        complianceType: "",
        highRisk: false,
        dueDate: "",
        notes: "",
        evidenceText: "",
      });
      refreshM8();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateComplianceItemMutation = useMutation({
    mutationFn: () => {
      if (!selectedComplianceItemId) {
        throw new Error("Select a compliance item first");
      }

      return subconnectApi.updateComplianceItem(selectedComplianceItemId, {
        status: reviewComplianceForm.status,
        highRisk: reviewComplianceForm.highRisk,
        reviewerConfirmed: reviewComplianceForm.reviewerConfirmed,
        dueDate: toIsoOrUndefined(reviewComplianceForm.dueDate),
        notes: reviewComplianceForm.notes.trim() || undefined,
        evidence: parseMetadataText(reviewComplianceForm.evidenceText),
      });
    },
    onSuccess: () => {
      toast.success("Compliance item updated");
      refreshM8();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const queueExtractionMutation = useMutation({
    mutationFn: () => {
      if (!selectedComplianceItemId) {
        throw new Error("Select a compliance item first");
      }

      return subconnectApi.queueInsuranceExtraction(selectedComplianceItemId, {
        prompt: extractionForm.prompt.trim(),
        sourceFileName: extractionForm.sourceFileName.trim() || undefined,
        sourceUrl: extractionForm.sourceUrl.trim() || undefined,
        provider: extractionForm.provider,
        model: extractionForm.model.trim() || undefined,
      });
    },
    onSuccess: (result) => {
      toast.success(`Insurance extraction queued (${result.jobId ?? "n/a"})`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reviewPayApplicationMutation = useMutation({
    mutationFn: () => {
      if (!selectedPayApplicationId) {
        throw new Error("Select a pay application first");
      }

      return subconnectApi.reviewPayApplication(selectedPayApplicationId, {
        status: payReviewForm.status,
        reason: payReviewForm.reason.trim() || undefined,
        reviewerNotes: payReviewForm.reviewerNotes.trim() || undefined,
        metadata: parseMetadataText(payReviewForm.metadataText),
      });
    },
    onSuccess: () => {
      toast.success("Pay application reviewed");
      refreshM8();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reviewDailyLogMutation = useMutation({
    mutationFn: () => {
      if (!selectedDailyLogId) {
        throw new Error("Select a daily log first");
      }

      return subconnectApi.reviewDailyLog(selectedDailyLogId, {
        reviewStatus: dailyReviewForm.reviewStatus,
        reviewNotes: dailyReviewForm.reviewNotes.trim() || undefined,
        metadata: parseMetadataText(dailyReviewForm.metadataText),
      });
    },
    onSuccess: () => {
      toast.success("Daily log reviewed");
      refreshM8();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const subcontractorColumns: DataTableColumn<Subcontractor>[] = [
    {
      key: "name",
      header: "Subcontractor",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.trade}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "170px",
      render: (row) => (
        <div className="space-y-1">
          <StatusBadge status={row.status} />
          <p className="text-xs text-muted-foreground">
            Portal: {row.portalEnabled ? "enabled" : "disabled"}
          </p>
        </div>
      ),
    },
    {
      key: "compliance",
      header: "Compliance",
      width: "220px",
      render: (row) => {
        const health = complianceHealth(row.complianceSummary);
        return (
          <p
            className={
              health.tone === "critical"
                ? "text-xs text-red-700 dark:text-red-400"
                : health.tone === "warning"
                  ? "text-xs text-amber-700 dark:text-amber-400"
                  : "text-xs text-muted-foreground"
            }
          >
            {health.label}
          </p>
        );
      },
    },
    {
      key: "actions",
      header: "",
      width: "110px",
      render: (row) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              if (window.confirm("Archive this subcontractor?")) {
                archiveSubcontractorMutation.mutate(row.id);
              }
            }}
            disabled={archiveSubcontractorMutation.isPending}
          >
            Archive
          </Button>
        </div>
      ),
    },
  ];

  const invitationColumns: DataTableColumn<
    InviteSubcontractorPortalResult["invitation"]
  >[] = [
    {
      key: "email",
      header: "Invite",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.email}</p>
          <p className="text-xs text-muted-foreground">{row.subcontractorId}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "160px",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "expires",
      header: "Expires",
      width: "200px",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.expiresAt)}
        </span>
      ),
    },
  ];

  const templateColumns: DataTableColumn<ComplianceTemplate>[] = [
    {
      key: "name",
      header: "Template",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.complianceType}</p>
        </div>
      ),
    },
    {
      key: "due",
      header: "Due",
      width: "150px",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.defaultDueDays} days
        </span>
      ),
    },
    {
      key: "required",
      header: "Flags",
      width: "170px",
      render: (row) => (
        <p className="text-xs text-muted-foreground">
          {row.required ? "Required" : "Optional"} •{" "}
          {row.highRisk ? "High risk" : "Standard"}
        </p>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "100px",
      render: (row) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              if (window.confirm("Archive this template?")) {
                archiveTemplateMutation.mutate(row.id);
              }
            }}
            disabled={archiveTemplateMutation.isPending}
          >
            Archive
          </Button>
        </div>
      ),
    },
  ];

  const complianceColumns: DataTableColumn<ComplianceItem>[] = [
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.complianceType}</p>
          <p className="text-xs text-muted-foreground">
            {row.subcontractorId ?? "unassigned"}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "160px",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "due",
      header: "Due",
      width: "170px",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.dueDate)}
        </span>
      ),
    },
  ];

  const payColumns: DataTableColumn<PayApplication>[] = [
    {
      key: "period",
      header: "Period",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">
            {new Date(row.periodStart).toLocaleDateString()} -{" "}
            {new Date(row.periodEnd).toLocaleDateString()}
          </p>
          <p className="text-xs text-muted-foreground">{row.subcontractorId}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "160px",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "amount",
      header: "Amount",
      width: "150px",
      render: (row) => (
        <span>{formatCents(row.totalAmountCents, row.currency)}</span>
      ),
    },
  ];

  const dailyColumns: DataTableColumn<DailyLog>[] = [
    {
      key: "date",
      header: "Log",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">
            {new Date(row.logDate).toLocaleDateString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Labor {row.laborCount}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Review",
      width: "160px",
      render: (row) => <StatusBadge status={row.reviewStatus} />,
    },
    {
      key: "subcontractor",
      header: "Subcontractor",
      width: "200px",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.subcontractorId}
        </span>
      ),
    },
  ];

  const invitationRows = invitationsQuery.data ?? [];
  const subcontractorRows = subcontractorsQuery.data ?? [];
  const templateRows = templatesQuery.data ?? [];
  const complianceRows = complianceItemsQuery.data ?? [];
  const payRows = payApplicationsQuery.data ?? [];
  const dailyRows = dailyLogsQuery.data ?? [];

  const showOnboarding = workspaceMode === "onboarding";
  const showOperations = workspaceMode === "operations";
  const showCompliance = showOperations;
  const showFinancial = showOperations;

  return (
    <div className="space-y-8">
      <PageHeader
        title="SubConnect Internal Operations"
        description="Operate subcontractor onboarding, compliance, and financial/work-log reviews from one screen."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshM8}
              disabled={
                subcontractorsQuery.isFetching ||
                invitationsQuery.isFetching ||
                complianceItemsQuery.isFetching
              }
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Workflow sections
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              SubConnect operations are split into two focused sections so teams
              can stay in onboarding or operations review.
            </p>
          </div>
          <div>
            <Label htmlFor="subconnect-workflow-focus">Focus mode</Label>
            <Select
              id="subconnect-workflow-focus"
              value={workspaceMode}
              onChange={(event) =>
                setWorkspaceMode(event.target.value as SubconnectWorkspaceMode)
              }
            >
              {(
                Object.keys(
                  SUBCONNECT_WORKSPACE_MODE_LABEL,
                ) as SubconnectWorkspaceMode[]
              ).map((mode) => (
                <option key={mode} value={mode}>
                  {SUBCONNECT_WORKSPACE_MODE_LABEL[mode]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-medium text-foreground">
            {SUBCONNECT_WORKSPACE_GUIDE[workspaceMode].title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {SUBCONNECT_WORKSPACE_GUIDE[workspaceMode].description}
          </p>
          <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
            {SUBCONNECT_WORKSPACE_GUIDE[workspaceMode].steps.map((step) => (
              <p
                key={step}
                className="rounded-md border border-border bg-background/80 px-3 py-2"
              >
                {step}
              </p>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Project ID filter"
          value={projectId}
          onChange={(event) => {
            setProjectId(event.target.value);
            setCreateSubcontractorForm((current) => ({
              ...current,
              projectId: event.target.value,
            }));
          }}
        />
        <Select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as SubcontractorStatus | "")
          }
          placeholder="All statuses"
        >
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="blocked">blocked</option>
        </Select>
        <Button
          variant="outline"
          onClick={() => {
            setStatusFilter("");
            setProjectId("");
          }}
        >
          Reset filters
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Subcontractors"
          value={subcontractorRows.length}
          subtitle={`${subcontractorRows.filter((item) => item.portalEnabled).length} portal enabled`}
          icon={Users}
          isLoading={subcontractorsQuery.isLoading}
        />
        <StatCard
          title="Invitations"
          value={invitationRows.length}
          subtitle={`${invitationRows.filter((item) => item.status === "pending").length} pending`}
          icon={UserPlus}
          isLoading={invitationsQuery.isLoading}
        />
        <StatCard
          title="Compliance Items"
          value={complianceRows.length}
          subtitle={`${complianceRows.filter((item) => item.status === "pending").length} pending`}
          icon={Shield}
          isLoading={complianceItemsQuery.isLoading}
        />
        <StatCard
          title="Pay + Logs"
          value={payRows.length + dailyRows.length}
          subtitle={`${payRows.length} pay apps • ${dailyRows.length} logs`}
          icon={ClipboardCheck}
          isLoading={payApplicationsQuery.isLoading || dailyLogsQuery.isLoading}
        />
      </div>

      {showOnboarding && (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <h2 className="text-base font-semibold text-foreground">
              Subcontractors
            </h2>
            <DataTable
              columns={subcontractorColumns}
              data={subcontractorRows}
              isLoading={subcontractorsQuery.isLoading}
              rowKey={(row) => row.id}
              onRowClick={(row) => setSelectedSubcontractorId(row.id)}
              emptyState={
                <EmptyState
                  icon={Users}
                  title="No subcontractors"
                  description="Create a subcontractor to start SubConnect workflows."
                />
              }
            />
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Create subcontractor
            </h3>
            <div className="space-y-2">
              <Input
                placeholder="Project ID"
                value={createSubcontractorForm.projectId}
                onChange={(event) =>
                  setCreateSubcontractorForm((current) => ({
                    ...current,
                    projectId: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Name"
                value={createSubcontractorForm.name}
                onChange={(event) =>
                  setCreateSubcontractorForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Email"
                value={createSubcontractorForm.email}
                onChange={(event) =>
                  setCreateSubcontractorForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Phone"
                value={createSubcontractorForm.phone}
                onChange={(event) =>
                  setCreateSubcontractorForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Trade"
                value={createSubcontractorForm.trade}
                onChange={(event) =>
                  setCreateSubcontractorForm((current) => ({
                    ...current,
                    trade: event.target.value,
                  }))
                }
              />
              <textarea
                className="flex min-h-[84px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                placeholder='Metadata JSON (optional), e.g. {"crewSize": 8}'
                value={createSubcontractorForm.metadataText}
                onChange={(event) =>
                  setCreateSubcontractorForm((current) => ({
                    ...current,
                    metadataText: event.target.value,
                  }))
                }
              />
              <Button
                className="w-full"
                onClick={() => createSubcontractorMutation.mutate()}
                disabled={createSubcontractorMutation.isPending}
              >
                {createSubcontractorMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create subcontractor
              </Button>
            </div>
          </div>
        </section>
      )}

      {showOnboarding && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground">
              Selected subcontractor detail
            </h2>
            {!selectedSubcontractor ? (
              <EmptyState
                title="No subcontractor selected"
                description="Pick a row from the subcontractors table."
                className="rounded-lg"
              />
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Project ID"
                  value={editSubcontractorForm.projectId}
                  onChange={(event) =>
                    setEditSubcontractorForm((current) => ({
                      ...current,
                      projectId: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Name"
                  value={editSubcontractorForm.name}
                  onChange={(event) =>
                    setEditSubcontractorForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Email"
                  value={editSubcontractorForm.email}
                  onChange={(event) =>
                    setEditSubcontractorForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Phone"
                  value={editSubcontractorForm.phone}
                  onChange={(event) =>
                    setEditSubcontractorForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Trade"
                  value={editSubcontractorForm.trade}
                  onChange={(event) =>
                    setEditSubcontractorForm((current) => ({
                      ...current,
                      trade: event.target.value,
                    }))
                  }
                />
                <Select
                  value={editSubcontractorForm.status}
                  onChange={(event) =>
                    setEditSubcontractorForm((current) => ({
                      ...current,
                      status: event.target.value as SubcontractorStatus,
                    }))
                  }
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="blocked">blocked</option>
                </Select>
                <textarea
                  className="flex min-h-[84px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  placeholder="Metadata JSON (optional)"
                  value={editSubcontractorForm.metadataText}
                  onChange={(event) =>
                    setEditSubcontractorForm((current) => ({
                      ...current,
                      metadataText: event.target.value,
                    }))
                  }
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => updateSubcontractorMutation.mutate()}
                    disabled={updateSubcontractorMutation.isPending}
                  >
                    {updateSubcontractorMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save subcontractor
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground">
              Invite lifecycle
            </h2>
            <div className="space-y-2">
              <Input
                placeholder="Invite email"
                value={inviteForm.email}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Project ID"
                value={inviteForm.projectId}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    projectId: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Temporary password (optional)"
                value={inviteForm.temporaryPassword}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    temporaryPassword: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Assigned scope"
                value={inviteForm.assignedScope}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    assignedScope: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Milestones (comma-separated)"
                value={inviteForm.milestonesText}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    milestonesText: event.target.value,
                  }))
                }
              />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={inviteForm.sendInviteEmail}
                  onChange={(event) =>
                    setInviteForm((current) => ({
                      ...current,
                      sendInviteEmail: event.target.checked,
                    }))
                  }
                />
                Send invite email
              </label>
              <Button
                className="w-full"
                onClick={() => inviteMutation.mutate()}
                disabled={
                  inviteMutation.isPending ||
                  selectedSubcontractorId.length === 0
                }
              >
                {inviteMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send portal invite
              </Button>
            </div>
            {lastInviteResult && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p>Invite URL: {lastInviteResult.inviteAcceptUrl}</p>
                <p>Token: {lastInviteResult.inviteToken}</p>
                <p>
                  Email queued:{" "}
                  {lastInviteResult.inviteEmailQueued ? "yes" : "no"}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {showOnboarding && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Invitation history
          </h2>
          <DataTable
            columns={invitationColumns}
            data={invitationRows}
            isLoading={invitationsQuery.isLoading}
            rowKey={(row) => row.id}
            emptyState={
              <EmptyState
                icon={UserPlus}
                title="No invitations"
                description="Issue a portal invite to start the lifecycle."
              />
            }
          />
        </section>
      )}

      {showCompliance && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground">
              Compliance templates
            </h2>
            {!normalizedProjectId && (
              <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Enter a project ID to manage templates.
              </p>
            )}
            <div className="space-y-2">
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
              <Input
                placeholder="Compliance type"
                value={templateForm.complianceType}
                onChange={(event) =>
                  setTemplateForm((current) => ({
                    ...current,
                    complianceType: event.target.value,
                  }))
                }
              />
              <Input
                type="number"
                min="1"
                max="365"
                placeholder="Default due days"
                value={templateForm.defaultDueDays}
                onChange={(event) =>
                  setTemplateForm((current) => ({
                    ...current,
                    defaultDueDays: event.target.value,
                  }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={templateForm.required}
                    onChange={(event) =>
                      setTemplateForm((current) => ({
                        ...current,
                        required: event.target.checked,
                      }))
                    }
                  />
                  Required
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={templateForm.highRisk}
                    onChange={(event) =>
                      setTemplateForm((current) => ({
                        ...current,
                        highRisk: event.target.checked,
                      }))
                    }
                  />
                  High risk
                </label>
              </div>
              <textarea
                className="flex min-h-[84px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                placeholder="Metadata JSON (optional)"
                value={templateForm.metadataText}
                onChange={(event) =>
                  setTemplateForm((current) => ({
                    ...current,
                    metadataText: event.target.value,
                  }))
                }
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => createTemplateMutation.mutate()}
                  disabled={
                    createTemplateMutation.isPending ||
                    normalizedProjectId.length === 0
                  }
                >
                  Create template
                </Button>
                <Button
                  onClick={() => updateTemplateMutation.mutate()}
                  disabled={
                    updateTemplateMutation.isPending ||
                    selectedTemplateId.length === 0
                  }
                >
                  Update selected
                </Button>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <Label>Apply templates to selected subcontractor</Label>
              <Input
                type="datetime-local"
                value={applyDueDateOverride}
                onChange={(event) =>
                  setApplyDueDateOverride(event.target.value)
                }
              />
              <Button
                variant="outline"
                onClick={() => applyTemplatesMutation.mutate()}
                disabled={
                  applyTemplatesMutation.isPending ||
                  selectedSubcontractorId.length === 0 ||
                  normalizedProjectId.length === 0
                }
              >
                Apply templates
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <DataTable
              columns={templateColumns}
              data={templateRows}
              isLoading={templatesQuery.isLoading}
              rowKey={(row) => row.id}
              onRowClick={(row) => setSelectedTemplateId(row.id)}
              emptyState={
                <EmptyState
                  icon={ClipboardList}
                  title="No templates"
                  description="Create compliance templates for repeatable onboarding."
                />
              }
            />

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Prequalification score
              </h3>
              {prequalificationQuery.isLoading ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Loading score...
                </p>
              ) : prequalificationQuery.data ? (
                <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p>
                    Overall:{" "}
                    {formatPercentBps(
                      prequalificationQuery.data.overallScoreBps,
                    )}
                  </p>
                  <p>Risk: {prequalificationQuery.data.riskLevel}</p>
                  <p>
                    Updated:{" "}
                    {formatDateTime(prequalificationQuery.data.createdAt)}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No score yet.
                </p>
              )}

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <Input
                  type="number"
                  min="0"
                  max="10000"
                  placeholder="Overall bps"
                  value={scoreForm.overallScoreBps}
                  onChange={(event) =>
                    setScoreForm((current) => ({
                      ...current,
                      overallScoreBps: event.target.value,
                    }))
                  }
                />
                <Input
                  type="number"
                  min="0"
                  max="10000"
                  placeholder="Safety bps"
                  value={scoreForm.safetyScoreBps}
                  onChange={(event) =>
                    setScoreForm((current) => ({
                      ...current,
                      safetyScoreBps: event.target.value,
                    }))
                  }
                />
                <Input
                  type="number"
                  min="0"
                  max="10000"
                  placeholder="Financial bps"
                  value={scoreForm.financialScoreBps}
                  onChange={(event) =>
                    setScoreForm((current) => ({
                      ...current,
                      financialScoreBps: event.target.value,
                    }))
                  }
                />
                <Input
                  type="number"
                  min="0"
                  max="10000"
                  placeholder="Compliance bps"
                  value={scoreForm.complianceScoreBps}
                  onChange={(event) =>
                    setScoreForm((current) => ({
                      ...current,
                      complianceScoreBps: event.target.value,
                    }))
                  }
                />
                <Input
                  type="number"
                  min="0"
                  max="10000"
                  placeholder="Capacity bps"
                  value={scoreForm.capacityScoreBps}
                  onChange={(event) =>
                    setScoreForm((current) => ({
                      ...current,
                      capacityScoreBps: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Model version"
                  value={scoreForm.modelVersion}
                  onChange={(event) =>
                    setScoreForm((current) => ({
                      ...current,
                      modelVersion: event.target.value,
                    }))
                  }
                />
                <Input
                  className="md:col-span-2"
                  placeholder="Notes"
                  value={scoreForm.notes}
                  onChange={(event) =>
                    setScoreForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
                <textarea
                  className="md:col-span-2 flex min-h-[84px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  placeholder="Metadata JSON (optional)"
                  value={scoreForm.metadataText}
                  onChange={(event) =>
                    setScoreForm((current) => ({
                      ...current,
                      metadataText: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="mt-3 flex justify-end">
                <Button
                  onClick={() => upsertScoreMutation.mutate()}
                  disabled={
                    upsertScoreMutation.isPending ||
                    selectedSubcontractorId.length === 0
                  }
                >
                  Upsert score
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {showCompliance && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              Compliance item review and extraction
            </h2>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Create compliance item
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  placeholder="Compliance type"
                  value={createComplianceForm.complianceType}
                  onChange={(event) =>
                    setCreateComplianceForm((current) => ({
                      ...current,
                      complianceType: event.target.value,
                    }))
                  }
                />
                <Input
                  type="datetime-local"
                  value={createComplianceForm.dueDate}
                  onChange={(event) =>
                    setCreateComplianceForm((current) => ({
                      ...current,
                      dueDate: event.target.value,
                    }))
                  }
                />
                <Input
                  className="md:col-span-2"
                  placeholder="Notes"
                  value={createComplianceForm.notes}
                  onChange={(event) =>
                    setCreateComplianceForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
                <label className="md:col-span-2 flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={createComplianceForm.highRisk}
                    onChange={(event) =>
                      setCreateComplianceForm((current) => ({
                        ...current,
                        highRisk: event.target.checked,
                      }))
                    }
                  />
                  High risk item
                </label>
                <textarea
                  className="md:col-span-2 flex min-h-[74px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  placeholder="Evidence JSON (optional)"
                  value={createComplianceForm.evidenceText}
                  onChange={(event) =>
                    setCreateComplianceForm((current) => ({
                      ...current,
                      evidenceText: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => createComplianceItemMutation.mutate()}
                  disabled={
                    createComplianceItemMutation.isPending ||
                    normalizedProjectId.length === 0
                  }
                >
                  Create compliance item
                </Button>
              </div>
            </div>

            <DataTable
              columns={complianceColumns}
              data={complianceRows}
              isLoading={complianceItemsQuery.isLoading}
              rowKey={(row) => row.id}
              onRowClick={(row) => setSelectedComplianceItemId(row.id)}
              emptyState={
                <EmptyState
                  icon={Shield}
                  title="No compliance items"
                  description="Create or apply templates to populate compliance checks."
                />
              }
            />
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Review selected compliance item
            </h3>
            {!selectedComplianceItem ? (
              <EmptyState
                title="No item selected"
                description="Select a compliance row to review it."
                className="rounded-lg"
              />
            ) : (
              <>
                <Select
                  value={reviewComplianceForm.status}
                  onChange={(event) =>
                    setReviewComplianceForm((current) => ({
                      ...current,
                      status: event.target.value as ComplianceStatus,
                    }))
                  }
                >
                  <option value="pending">pending</option>
                  <option value="verified">verified</option>
                  <option value="expiring">expiring</option>
                  <option value="expired">expired</option>
                  <option value="non_compliant">non_compliant</option>
                  <option value="compliant">compliant</option>
                </Select>
                <Input
                  type="datetime-local"
                  value={reviewComplianceForm.dueDate}
                  onChange={(event) =>
                    setReviewComplianceForm((current) => ({
                      ...current,
                      dueDate: event.target.value,
                    }))
                  }
                />
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={reviewComplianceForm.highRisk}
                    onChange={(event) =>
                      setReviewComplianceForm((current) => ({
                        ...current,
                        highRisk: event.target.checked,
                      }))
                    }
                  />
                  High risk
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={reviewComplianceForm.reviewerConfirmed}
                    onChange={(event) =>
                      setReviewComplianceForm((current) => ({
                        ...current,
                        reviewerConfirmed: event.target.checked,
                      }))
                    }
                  />
                  Reviewer confirmed
                </label>
                <Input
                  placeholder="Review notes"
                  value={reviewComplianceForm.notes}
                  onChange={(event) =>
                    setReviewComplianceForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
                <textarea
                  className="flex min-h-[84px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  placeholder="Evidence JSON (optional)"
                  value={reviewComplianceForm.evidenceText}
                  onChange={(event) =>
                    setReviewComplianceForm((current) => ({
                      ...current,
                      evidenceText: event.target.value,
                    }))
                  }
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => updateComplianceItemMutation.mutate()}
                    disabled={updateComplianceItemMutation.isPending}
                  >
                    Update compliance item
                  </Button>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-medium text-foreground">
                    Queue insurance extraction
                  </p>
                  <textarea
                    className="mb-2 flex min-h-[84px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                    placeholder="Paste insurance text to extract"
                    value={extractionForm.prompt}
                    onChange={(event) =>
                      setExtractionForm((current) => ({
                        ...current,
                        prompt: event.target.value,
                      }))
                    }
                  />
                  <Input
                    className="mb-2"
                    placeholder="Source file name"
                    value={extractionForm.sourceFileName}
                    onChange={(event) =>
                      setExtractionForm((current) => ({
                        ...current,
                        sourceFileName: event.target.value,
                      }))
                    }
                  />
                  <Input
                    className="mb-2"
                    placeholder="Source URL"
                    value={extractionForm.sourceUrl}
                    onChange={(event) =>
                      setExtractionForm((current) => ({
                        ...current,
                        sourceUrl: event.target.value,
                      }))
                    }
                  />
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <Select
                      value={extractionForm.provider}
                      onChange={(event) =>
                        setExtractionForm((current) => ({
                          ...current,
                          provider: event.target.value as
                            | "openai"
                            | "anthropic"
                            | "gemini"
                            | "azure-openai",
                        }))
                      }
                    >
                      <option value="openai">openai</option>
                      <option value="anthropic">anthropic</option>
                      <option value="gemini">gemini</option>
                      <option value="azure-openai">azure-openai</option>
                    </Select>
                    <Input
                      placeholder="Model"
                      value={extractionForm.model}
                      onChange={(event) =>
                        setExtractionForm((current) => ({
                          ...current,
                          model: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => queueExtractionMutation.mutate()}
                    disabled={queueExtractionMutation.isPending}
                  >
                    Queue extraction
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {showFinancial && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              Pay application review
            </h2>
            <DataTable
              columns={payColumns}
              data={payRows}
              isLoading={payApplicationsQuery.isLoading}
              rowKey={(row) => row.id}
              onRowClick={(row) => setSelectedPayApplicationId(row.id)}
              emptyState={
                <EmptyState
                  icon={ClipboardCheck}
                  title="No pay applications"
                  description="Waiting for subcontractor submissions."
                />
              }
            />
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Selected pay application
            </h3>
            {!selectedPayApplication ? (
              <EmptyState
                title="No pay app selected"
                description="Select a pay application row to review details."
                className="rounded-lg"
              />
            ) : (
              <>
                <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p>Status: {selectedPayApplication.status}</p>
                  <p>
                    Amount:{" "}
                    {formatCents(
                      selectedPayApplication.totalAmountCents,
                      selectedPayApplication.currency,
                    )}
                  </p>
                  <p>Line items: {selectedPayApplication.lineItems.length}</p>
                  <p>
                    Timeline events: {selectedPayApplication.timeline.length}
                  </p>
                </div>
                <Select
                  value={payReviewForm.status}
                  onChange={(event) =>
                    setPayReviewForm((current) => ({
                      ...current,
                      status: event.target.value as
                        | "under_review"
                        | "approved"
                        | "rejected"
                        | "paid",
                    }))
                  }
                >
                  <option value="under_review">under_review</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                  <option value="paid">paid</option>
                </Select>
                <Input
                  placeholder="Reason"
                  value={payReviewForm.reason}
                  onChange={(event) =>
                    setPayReviewForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Reviewer notes"
                  value={payReviewForm.reviewerNotes}
                  onChange={(event) =>
                    setPayReviewForm((current) => ({
                      ...current,
                      reviewerNotes: event.target.value,
                    }))
                  }
                />
                <textarea
                  className="flex min-h-[84px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  placeholder="Metadata JSON (optional)"
                  value={payReviewForm.metadataText}
                  onChange={(event) =>
                    setPayReviewForm((current) => ({
                      ...current,
                      metadataText: event.target.value,
                    }))
                  }
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => reviewPayApplicationMutation.mutate()}
                    disabled={reviewPayApplicationMutation.isPending}
                  >
                    Review pay app
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {showFinancial && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              Daily log review
            </h2>
            <DataTable
              columns={dailyColumns}
              data={dailyRows}
              isLoading={dailyLogsQuery.isLoading}
              rowKey={(row) => row.id}
              onRowClick={(row) => setSelectedDailyLogId(row.id)}
              emptyState={
                <EmptyState
                  icon={ClipboardList}
                  title="No daily logs"
                  description="Waiting for field submissions."
                />
              }
            />
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Selected daily log
            </h3>
            {!selectedDailyLog ? (
              <EmptyState
                title="No daily log selected"
                description="Select a daily log row to review details."
                className="rounded-lg"
              />
            ) : (
              <>
                <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p>
                    Date:{" "}
                    {new Date(selectedDailyLog.logDate).toLocaleDateString()}
                  </p>
                  <p>Labor count: {selectedDailyLog.laborCount}</p>
                  <p>Status: {selectedDailyLog.reviewStatus}</p>
                  <p>Timeline events: {selectedDailyLog.timeline.length}</p>
                </div>
                <Select
                  value={dailyReviewForm.reviewStatus}
                  onChange={(event) =>
                    setDailyReviewForm((current) => ({
                      ...current,
                      reviewStatus: event.target.value as
                        | "reviewed"
                        | "rejected",
                    }))
                  }
                >
                  <option value="reviewed">reviewed</option>
                  <option value="rejected">rejected</option>
                </Select>
                <Input
                  placeholder="Review notes"
                  value={dailyReviewForm.reviewNotes}
                  onChange={(event) =>
                    setDailyReviewForm((current) => ({
                      ...current,
                      reviewNotes: event.target.value,
                    }))
                  }
                />
                <textarea
                  className="flex min-h-[84px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  placeholder="Metadata JSON (optional)"
                  value={dailyReviewForm.metadataText}
                  onChange={(event) =>
                    setDailyReviewForm((current) => ({
                      ...current,
                      metadataText: event.target.value,
                    }))
                  }
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => reviewDailyLogMutation.mutate()}
                    disabled={reviewDailyLogMutation.isPending}
                  >
                    Review daily log
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        M8 contract coverage: subcontractors, invitations, compliance
        templates/items, prequalification, pay app review, and daily log review.
      </p>
    </div>
  );
}
