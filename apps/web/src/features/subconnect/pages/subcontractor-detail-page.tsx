"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-radix";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
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
  type InviteSubcontractorPortalResult,
  type PayApplication,
  type PayApplicationDetail,
  type PortalInvitation,
  type SubcontractorStatus,
  subconnectApi,
} from "@/lib/api/modules/subconnect-api";
import { projectsApi } from "@/lib/api/modules/projects-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  DollarSign,
  Loader2,
  Mail,
  Phone,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Tab = "overview" | "compliance" | "financial" | "logs";

type LifecycleModal = "none" | "edit" | "invite" | "create-template" | "edit-template" | "create-item";

function parseMetadataText(input: string) {
  const value = input.trim();
  if (value.length === 0) return undefined;
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
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

function formatPercentBps(value: number) {
  return `${(value / 100).toFixed(1)}%`;
}

function toDateOrUndefined(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function RiskBadge({ level }: { level: "low" | "medium" | "high" | "critical" }) {
  const classes: Record<string, string> = {
    low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes[level]}`}>
      {level}
    </span>
  );
}

function ComplianceStatusBadge({ status }: { status: ComplianceStatus }) {
  const classes: Record<ComplianceStatus, string> = {
    pending: "bg-muted text-muted-foreground",
    verified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    expiring: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    non_compliant: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    compliant: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  };
  const labels: Record<ComplianceStatus, string> = {
    pending: "Pending",
    verified: "Verified",
    expiring: "Expiring",
    expired: "Expired",
    non_compliant: "Non-Compliant",
    compliant: "Compliant",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}

interface SubcontractorDetailPageProps {
  subcontractorId: string;
}

export function SubcontractorDetailPage({ subcontractorId }: SubcontractorDetailPageProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [activeModal, setActiveModal] = useState<LifecycleModal>("none");

  // Selection state
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedComplianceItemId, setSelectedComplianceItemId] = useState("");
  const [selectedPayApplicationId, setSelectedPayApplicationId] = useState("");
  const [selectedDailyLogId, setSelectedDailyLogId] = useState("");
  const [lastInviteResult, setLastInviteResult] = useState<InviteSubcontractorPortalResult | null>(null);
  const [invitationStatusFilter, setInvitationStatusFilter] = useState<PortalInvitation["status"] | "all">("all");
  const [applyDueDateOverride, setApplyDueDateOverride] = useState("");
  const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);

  // Forms
  const [editForm, setEditForm] = useState({
    projectId: "",
    name: "",
    email: "",
    phone: "",
    trade: "",
    status: "active" as SubcontractorStatus,
  });

  const [inviteForm, setInviteForm] = useState({
    email: "",
    projectId: "",
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
  });

  const [createItemForm, setCreateItemForm] = useState({
    complianceType: "",
    highRisk: false,
    dueDate: "",
    notes: "",
  });

  const [reviewItemForm, setReviewItemForm] = useState({
    status: "pending" as ComplianceStatus,
    highRisk: false,
    reviewerConfirmed: false,
    dueDate: "",
    notes: "",
  });

  const [payReviewForm, setPayReviewForm] = useState({
    status: "under_review" as "under_review" | "approved" | "rejected" | "paid",
    reason: "",
    reviewerNotes: "",
  });

  const [dailyReviewForm, setDailyReviewForm] = useState({
    reviewStatus: "reviewed" as "reviewed" | "rejected",
    reviewNotes: "",
  });

  // Queries
  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => projectsApi.list(),
  });

  const subcontractorQuery = useQuery({
    queryKey: queryKeys.subcontractors.detail(subcontractorId),
    queryFn: () => subconnectApi.getSubcontractor(subcontractorId),
  });

  const subcontractor = subcontractorQuery.data ?? null;
  const projectId = subcontractor?.projectId?.trim() ?? "";
  const projectOptions = projectsQuery.data ?? [];

  const invitationsQuery = useQuery({
    queryKey: queryKeys.subconnect.invitations({
      subcontractorId,
      status: invitationStatusFilter === "all" ? undefined : invitationStatusFilter,
      limit: 50,
    }),
    queryFn: () =>
      subconnectApi.listInvitations({
        subcontractorId,
        status: invitationStatusFilter === "all" ? undefined : invitationStatusFilter,
        limit: 50,
      }),
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.subconnect.complianceTemplates(projectId),
    queryFn: () => subconnectApi.listComplianceTemplates(projectId),
    enabled: projectId.length > 0,
  });

  const complianceItemsQuery = useQuery({
    queryKey: queryKeys.compliance.list({ subcontractorId }),
    queryFn: () => subconnectApi.listComplianceItems({ subcontractorId }),
  });

  const prequalQuery = useQuery({
    queryKey: queryKeys.subconnect.prequalification(subcontractorId),
    queryFn: () => getLatestScoreSafe(subcontractorId),
    retry: false,
  });

  const payApplicationsQuery = useQuery({
    queryKey: queryKeys.subconnect.payApplications({ subcontractorId, limit: 100 }),
    queryFn: () => subconnectApi.listPayApplications({ subcontractorId, limit: 100 }),
  });

  const payDetailQuery = useQuery({
    queryKey: queryKeys.subconnect.payApplicationDetail(selectedPayApplicationId),
    queryFn: () => subconnectApi.getPayApplication(selectedPayApplicationId),
    enabled: selectedPayApplicationId.length > 0,
  });

  const dailyLogsQuery = useQuery({
    queryKey: queryKeys.subconnect.dailyLogs({ subcontractorId, limit: 100 }),
    queryFn: () => subconnectApi.listDailyLogs({ subcontractorId, limit: 100 }),
  });

  const dailyLogDetailQuery = useQuery({
    queryKey: queryKeys.subconnect.dailyLogDetail(selectedDailyLogId),
    queryFn: () => subconnectApi.getDailyLog(selectedDailyLogId),
    enabled: selectedDailyLogId.length > 0,
  });

  const selectedTemplate = (templatesQuery.data ?? []).find((t) => t.id === selectedTemplateId) ?? null;
  const selectedComplianceItem = (complianceItemsQuery.data ?? []).find((i) => i.id === selectedComplianceItemId) ?? null;
  const selectedPayApp = payDetailQuery.data ?? null;
  const selectedDailyLog = dailyLogDetailQuery.data ?? null;
  const applyDueDateOverrideDate = toDateOrUndefined(applyDueDateOverride);

  const complianceTimeline = selectedComplianceItem
    ? [
        {
          id: `${selectedComplianceItem.id}-created`,
          label: "Created",
          status: "created",
          at: selectedComplianceItem.createdAt,
        },
        {
          id: `${selectedComplianceItem.id}-reminder`,
          label: "Reminder sent",
          status: "reminder",
          at: selectedComplianceItem.reminderSentAt,
        },
        {
          id: `${selectedComplianceItem.id}-escalation`,
          label: "Escalation sent",
          status: "escalation",
          at: selectedComplianceItem.escalationSentAt,
        },
        {
          id: `${selectedComplianceItem.id}-reviewed`,
          label: "Reviewer confirmed",
          status: "confirmed",
          at: selectedComplianceItem.reviewerConfirmedAt,
        },
        {
          id: `${selectedComplianceItem.id}-updated`,
          label: "Updated",
          status: "updated",
          at: selectedComplianceItem.updatedAt,
        },
      ]
        .filter((event): event is { id: string; label: string; status: string; at: string } => Boolean(event.at))
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    : [];

  const payTimeline = selectedPayApp
    ? [...selectedPayApp.timeline].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
    : [];

  const dailyLogTimeline = selectedDailyLog
    ? [...selectedDailyLog.timeline].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
    : [];

  // Sync forms from selected data
  useEffect(() => {
    if (!subcontractor) return;
    setEditForm({
      projectId: subcontractor.projectId ?? "",
      name: subcontractor.name,
      email: subcontractor.email ?? "",
      phone: subcontractor.phone ?? "",
      trade: subcontractor.trade,
      status: subcontractor.status,
    });
    setInviteForm((c) => ({
      ...c,
      email: subcontractor.email ?? c.email,
      projectId: subcontractor.projectId ?? c.projectId,
    }));
  }, [subcontractor]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setTemplateForm({
      name: selectedTemplate.name,
      complianceType: selectedTemplate.complianceType,
      defaultDueDays: String(selectedTemplate.defaultDueDays),
      required: selectedTemplate.required,
      highRisk: selectedTemplate.highRisk,
    });
  }, [selectedTemplate]);

  useEffect(() => {
    if (!selectedComplianceItem) return;
    setReviewItemForm({
      status: selectedComplianceItem.status,
      highRisk: selectedComplianceItem.highRisk,
      reviewerConfirmed: Boolean(selectedComplianceItem.reviewerConfirmedAt),
      dueDate: selectedComplianceItem.dueDate
        ? new Date(selectedComplianceItem.dueDate).toISOString().slice(0, 16)
        : "",
      notes: selectedComplianceItem.notes ?? "",
    });
  }, [selectedComplianceItem]);

  useEffect(() => {
    if (!selectedPayApp) return;
    setPayReviewForm((c) => ({
      ...c,
      status:
        selectedPayApp.status === "draft" || selectedPayApp.status === "submitted"
          ? "under_review"
          : selectedPayApp.status,
      reason: selectedPayApp.rejectionReason ?? "",
    }));
  }, [selectedPayApp]);

  useEffect(() => {
    if (!selectedDailyLog) return;
    setDailyReviewForm((c) => ({
      ...c,
      reviewStatus: selectedDailyLog.reviewStatus === "pending" ? "reviewed" : selectedDailyLog.reviewStatus,
      reviewNotes: selectedDailyLog.reviewNotes ?? "",
    }));
  }, [selectedDailyLog]);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.subcontractors.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.subconnect.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.compliance.all });
  }

  // Mutations
  const updateMutation = useMutation({
    mutationFn: () =>
      subconnectApi.updateSubcontractor(subcontractorId, {
        projectId: editForm.projectId.trim() || undefined,
        name: editForm.name.trim(),
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        trade: editForm.trade.trim(),
        status: editForm.status,
      }),
    onSuccess: () => { toast.success("Subcontractor updated"); setActiveModal("none"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      subconnectApi.inviteSubcontractorPortal(subcontractorId, {
        email: inviteForm.email.trim() || undefined,
        projectId: inviteForm.projectId.trim() || undefined,
        assignedScope: inviteForm.assignedScope.trim() || undefined,
        milestones: parseCommaSeparated(inviteForm.milestonesText),
        sendInviteEmail: inviteForm.sendInviteEmail,
      }),
    onSuccess: (result) => {
      toast.success("Portal invitation sent");
      setLastInviteResult(result);
      setActiveModal("none");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createTemplateMutation = useMutation({
    mutationFn: () => {
      if (!projectId) throw new Error("Subcontractor must be assigned to a project first");
      return subconnectApi.createComplianceTemplate({
        projectId,
        name: templateForm.name.trim(),
        complianceType: templateForm.complianceType.trim(),
        defaultDueDays: Number.parseInt(templateForm.defaultDueDays, 10),
        required: templateForm.required,
        highRisk: templateForm.highRisk,
      });
    },
    onSuccess: (record) => {
      toast.success("Template created");
      setSelectedTemplateId(record.id);
      setActiveModal("none");
      setTemplateForm({ name: "", complianceType: "", defaultDueDays: "30", required: true, highRisk: false });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: () => {
      if (!selectedTemplateId) throw new Error("Select a template first");
      return subconnectApi.updateComplianceTemplate(selectedTemplateId, {
        name: templateForm.name.trim(),
        complianceType: templateForm.complianceType.trim(),
        defaultDueDays: Number.parseInt(templateForm.defaultDueDays, 10),
        required: templateForm.required,
        highRisk: templateForm.highRisk,
      });
    },
    onSuccess: () => { toast.success("Template updated"); setActiveModal("none"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveTemplateMutation = useMutation({
    mutationFn: (id: string) => subconnectApi.archiveComplianceTemplate(id),
    onSuccess: () => { toast.success("Template archived"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyTemplatesMutation = useMutation({
    mutationFn: () => {
      if (!projectId) throw new Error("No project assigned to this subcontractor");
      return subconnectApi.applyComplianceTemplates({
        projectId,
        subcontractorId,
        dueDateOverride: toIsoOrUndefined(applyDueDateOverride),
      });
    },
    onSuccess: (result) => { toast.success(`Applied ${result.created} template(s)`); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createItemMutation = useMutation({
    mutationFn: () => {
      if (!projectId) throw new Error("Subcontractor must be assigned to a project");
      return subconnectApi.createComplianceItem({
        projectId,
        subcontractorId,
        complianceType: createItemForm.complianceType.trim(),
        highRisk: createItemForm.highRisk,
        dueDate: toIsoOrUndefined(createItemForm.dueDate),
        notes: createItemForm.notes.trim() || undefined,
      });
    },
    onSuccess: (record) => {
      toast.success("Compliance item created");
      setSelectedComplianceItemId(record.id);
      setActiveModal("none");
      setCreateItemForm({ complianceType: "", highRisk: false, dueDate: "", notes: "" });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItemMutation = useMutation({
    mutationFn: () => {
      if (!selectedComplianceItemId) throw new Error("Select a compliance item first");
      return subconnectApi.updateComplianceItem(selectedComplianceItemId, {
        status: reviewItemForm.status,
        highRisk: reviewItemForm.highRisk,
        reviewerConfirmed: reviewItemForm.reviewerConfirmed,
        dueDate: toIsoOrUndefined(reviewItemForm.dueDate),
        notes: reviewItemForm.notes.trim() || undefined,
      });
    },
    onSuccess: () => { toast.success("Compliance item updated"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewPayMutation = useMutation({
    mutationFn: () => {
      if (!selectedPayApplicationId) throw new Error("Select a pay application first");
      return subconnectApi.reviewPayApplication(selectedPayApplicationId, {
        status: payReviewForm.status,
        reason: payReviewForm.reason.trim() || undefined,
        reviewerNotes: payReviewForm.reviewerNotes.trim() || undefined,
      });
    },
    onSuccess: () => { toast.success("Pay application reviewed"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewDailyLogMutation = useMutation({
    mutationFn: () => {
      if (!selectedDailyLogId) throw new Error("Select a daily log first");
      return subconnectApi.reviewDailyLog(selectedDailyLogId, {
        reviewStatus: dailyReviewForm.reviewStatus,
        reviewNotes: dailyReviewForm.reviewNotes.trim() || undefined,
      });
    },
    onSuccess: () => { toast.success("Daily log reviewed"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Derived counts
  const complianceItems = complianceItemsQuery.data ?? [];
  const payApps = payApplicationsQuery.data ?? [];
  const dailyLogs = dailyLogsQuery.data ?? [];
  const templates = templatesQuery.data ?? [];

  const pendingComplianceCount = complianceItems.filter((i) => i.status === "pending" || i.status === "expiring").length;
  const actionNeededCount = complianceItems.filter((i) => i.status === "expired" || i.status === "non_compliant").length;
  const verifiedCount = complianceItems.filter((i) => i.status === "verified" || i.status === "compliant").length;
  const pendingPayCount = payApps.filter((p) => p.status === "submitted" || p.status === "under_review").length;
  const pendingLogCount = dailyLogs.filter((l) => l.reviewStatus === "pending").length;

  const subcontractorName = subcontractor?.name ?? subcontractorId;

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "compliance", label: "Compliance", badge: actionNeededCount > 0 ? actionNeededCount : undefined },
    { key: "financial", label: "Financial", badge: pendingPayCount > 0 ? pendingPayCount : undefined },
    { key: "logs", label: "Work Logs", badge: pendingLogCount > 0 ? pendingLogCount : undefined },
  ];

  // ── Table column definitions ─────────────────────────────────────────
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
      key: "flags",
      header: "Flags",
      width: "160px",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.required && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Required</span>
          )}
          {row.highRisk && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              High risk
            </span>
          )}
        </div>
      ),
    },
    {
      key: "due",
      header: "Default due",
      width: "130px",
      render: (row) => <span className="text-xs text-muted-foreground">{row.defaultDueDays}d</span>,
    },
    {
      key: "actions",
      header: "",
      width: "90px",
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive text-xs"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm("Archive this template?")) archiveTemplateMutation.mutate(row.id);
          }}
          disabled={archiveTemplateMutation.isPending}
        >
          Archive
        </Button>
      ),
    },
  ];

  const complianceColumns: DataTableColumn<ComplianceItem>[] = [
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.highRisk && <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-orange-500" />}
          <div>
            <p className="font-medium text-foreground">{row.complianceType}</p>
            {row.dueDate && (
              <p className="text-xs text-muted-foreground">Due {new Date(row.dueDate).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "150px",
      render: (row) => <ComplianceStatusBadge status={row.status} />,
    },
    {
      key: "reviewer",
      header: "Reviewer",
      width: "120px",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.reviewerConfirmedAt ? "Confirmed" : "—"}
        </span>
      ),
    },
  ];

  const payColumns: DataTableColumn<PayApplication>[] = [
    {
      key: "period",
      header: "Pay Period",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">
            {new Date(row.periodStart).toLocaleDateString()} – {new Date(row.periodEnd).toLocaleDateString()}
          </p>
          <p className="text-xs text-muted-foreground">{row.summary ?? "No summary"}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      width: "130px",
      render: (row) => (
        <span className="font-medium text-foreground">{formatCents(row.totalAmountCents, row.currency)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "150px",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "submitted",
      header: "Submitted",
      width: "150px",
      render: (row) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(row.submittedAt)}</span>
      ),
    },
  ];

  const dailyColumns: DataTableColumn<DailyLog>[] = [
    {
      key: "date",
      header: "Log Date",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{new Date(row.logDate).toLocaleDateString()}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{row.performedWork}</p>
        </div>
      ),
    },
    {
      key: "labor",
      header: "Labor",
      width: "90px",
      render: (row) => <span className="text-sm text-foreground">{row.laborCount}</span>,
    },
    {
      key: "status",
      header: "Review",
      width: "130px",
      render: (row) => <StatusBadge status={row.reviewStatus} />,
    },
    {
      key: "submitted",
      header: "Submitted",
      width: "150px",
      render: (row) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(row.submittedAt)}</span>
      ),
    },
  ];

  const inviteColumns: DataTableColumn<PortalInvitation>[] = [
    {
      key: "email",
      header: "Email",
      render: (row) => <span className="text-sm text-foreground">{row.email}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "140px",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "invitedAt",
      header: "Sent",
      width: "160px",
      render: (row) => <span className="text-xs text-muted-foreground">{formatDateTime(row.invitedAt)}</span>,
    },
    {
      key: "acceptedAt",
      header: "Accepted",
      width: "160px",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.acceptedAt ? formatDateTime(row.acceptedAt) : "—"}
        </span>
      ),
    },
    {
      key: "expires",
      header: "Expires",
      width: "160px",
      render: (row) => <span className="text-xs text-muted-foreground">{formatDateTime(row.expiresAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/subconnect" className="hover:text-foreground transition-colors">SubConnect</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium text-foreground truncate max-w-[240px]">{subcontractorName}</span>
      </nav>

      <PageHeader
        title={subcontractorName}
        description={
          subcontractor
            ? `${subcontractor.trade} · ${subcontractor.email ?? "no email"} · ${subcontractor.status}`
            : "Loading subcontractor…"
        }
      />

      {/* Quick stats */}
      {!subcontractorQuery.isLoading && subcontractor && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Compliance items"
            value={complianceItems.length}
            subtitle={`${verifiedCount} verified · ${actionNeededCount} need action`}
            icon={Shield}
            isLoading={complianceItemsQuery.isLoading}
          />
          <StatCard
            title="Pending review"
            value={pendingComplianceCount}
            subtitle={actionNeededCount > 0 ? `${actionNeededCount} escalated` : "None escalated"}
            icon={ShieldAlert}
            isLoading={complianceItemsQuery.isLoading}
          />
          <StatCard
            title="Pay applications"
            value={payApps.length}
            subtitle={`${pendingPayCount} awaiting review`}
            icon={DollarSign}
            isLoading={payApplicationsQuery.isLoading}
          />
          <StatCard
            title="Work logs"
            value={dailyLogs.length}
            subtitle={`${pendingLogCount} pending review`}
            icon={ClipboardList}
            isLoading={dailyLogsQuery.isLoading}
          />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-muted/40 p-1 w-fit border border-border/50">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {subcontractorQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" />Loading subcontractor…
            </div>
          ) : !subcontractor ? (
            <EmptyState title="Subcontractor not found" description={`No subcontractor found for ID: ${subcontractorId}`} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Profile card */}
              <div className="lg:col-span-2 rounded-xl bg-card border border-border/70 p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground">{subcontractor.name}</h2>
                      <p className="text-xs text-muted-foreground">{subcontractor.trade}</p>
                    </div>
                  </div>
                  <StatusBadge status={subcontractor.status} />
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span>{subcontractor.email ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{subcontractor.phone ?? "—"}</span>
                  </div>
                  <div className="text-muted-foreground">
                    <span className="text-xs font-medium uppercase tracking-wide">Project</span>
                    <p className="mt-0.5 text-foreground">{subcontractor.projectId ?? "Not assigned"}</p>
                  </div>
                  <div className="text-muted-foreground">
                    <span className="text-xs font-medium uppercase tracking-wide">Portal access</span>
                    <p className={`mt-0.5 font-medium ${subcontractor.portalEnabled ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                      {subcontractor.portalEnabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  <div className="text-muted-foreground">
                    <span className="text-xs font-medium uppercase tracking-wide">Onboarded</span>
                    <p className="mt-0.5 text-foreground">{formatDateTime(subcontractor.createdAt)}</p>
                  </div>
                  <div className="text-muted-foreground">
                    <span className="text-xs font-medium uppercase tracking-wide">Last updated</span>
                    <p className="mt-0.5 text-foreground">{formatDateTime(subcontractor.updatedAt)}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setActiveModal("edit")}>
                    Edit profile
                  </Button>
                  <Button size="sm" onClick={() => setActiveModal("invite")}>
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Invite to portal
                  </Button>
                </div>

                {lastInviteResult && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Latest invite</p>
                    <p>
                      Link:{" "}
                      <a href={lastInviteResult.inviteAcceptUrl} className="text-primary underline" target="_blank" rel="noreferrer">
                        Open invite link
                      </a>
                    </p>
                    <p>Email queued: {lastInviteResult.inviteEmailQueued ? "Yes" : "No"}</p>
                  </div>
                )}
              </div>

              {/* Prequalification score card */}
              <div className="rounded-xl bg-card border border-border/70 p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Prequalification score</h3>
                {prequalQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : prequalQuery.data ? (
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">
                        {formatPercentBps(prequalQuery.data.overallScoreBps)}
                      </span>
                      <RiskBadge level={prequalQuery.data.riskLevel} />
                    </div>
                    {prequalQuery.data.safetyScoreBps != null && (
                      <ScoreRow label="Safety" value={prequalQuery.data.safetyScoreBps} />
                    )}
                    {prequalQuery.data.financialScoreBps != null && (
                      <ScoreRow label="Financial" value={prequalQuery.data.financialScoreBps} />
                    )}
                    {prequalQuery.data.complianceScoreBps != null && (
                      <ScoreRow label="Compliance" value={prequalQuery.data.complianceScoreBps} />
                    )}
                    {prequalQuery.data.capacityScoreBps != null && (
                      <ScoreRow label="Capacity" value={prequalQuery.data.capacityScoreBps} />
                    )}
                    {prequalQuery.data.notes && (
                      <p className="text-xs text-muted-foreground border-t border-border/50 pt-2 mt-2">
                        {prequalQuery.data.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Scored {formatDateTime(prequalQuery.data.createdAt)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No score recorded yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Invitation history */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">Portal invitation history</h2>
              <div className="w-44">
                <Select
                  value={invitationStatusFilter}
                  onValueChange={(v) => setInvitationStatusFilter(v as PortalInvitation["status"] | "all")}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DataTable
              columns={inviteColumns}
              data={invitationsQuery.data ?? []}
              isLoading={invitationsQuery.isLoading}
              rowKey={(row) => row.id}
              emptyState={
                <EmptyState icon={UserPlus} title="No invitations yet" description="Use the invite button to send portal access." />
              }
            />
          </div>
        </div>
      )}

      {/* ── COMPLIANCE TAB ───────────────────────────────────────────── */}
      {activeTab === "compliance" && (
        <div className="space-y-6">
          {/* Compliance summary */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/70 bg-card p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-foreground">Verified</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{verifiedCount}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card p-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium text-foreground">In progress</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{pendingComplianceCount}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card p-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-foreground">Needs action</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{actionNeededCount}</p>
            </div>
          </div>

          <div className={selectedComplianceItem ? "grid gap-6 xl:grid-cols-2" : "space-y-6"}>
            {/* Left: Items list + create */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">Compliance items</h2>
                <Button size="sm" onClick={() => setActiveModal("create-item")} disabled={!projectId}>
                  Add item
                </Button>
              </div>
              {!projectId && (
                <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Assign this subcontractor to a project to manage compliance items.
                </p>
              )}
              <DataTable
                columns={complianceColumns}
                data={complianceItems}
                isLoading={complianceItemsQuery.isLoading}
                rowKey={(row) => row.id}
                onRowClick={(row) =>
                  setSelectedComplianceItemId((currentId) =>
                    currentId === row.id ? "" : row.id,
                  )
                }
                emptyState={
                  <EmptyState
                    icon={Shield}
                    title="No compliance items"
                    description="Add items manually or apply templates below."
                  />
                }
              />
            </div>

            {selectedComplianceItem && (
              <div className="space-y-4">
                <div className="rounded-xl bg-card border border-border/70 p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {`Review: ${selectedComplianceItem.complianceType}`}
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedComplianceItemId("")}
                      aria-label="Close compliance review"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground rounded-md bg-muted/30 p-3">
                      <span>ID: <span className="font-mono text-foreground">{selectedComplianceItem.id.slice(0, 8)}…</span></span>
                      <span>·</span>
                      <span>Current: <ComplianceStatusBadge status={selectedComplianceItem.status} /></span>
                      {selectedComplianceItem.highRisk && (
                        <>
                          <span>·</span>
                          <span className="text-orange-600 dark:text-orange-400 font-medium">High risk</span>
                        </>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select
                        value={reviewItemForm.status}
                        onValueChange={(v) => setReviewItemForm((c) => ({ ...c, status: v as ComplianceStatus }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="verified">Verified</SelectItem>
                          <SelectItem value="expiring">Expiring</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                          <SelectItem value="compliant">Compliant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Due date</Label>
                      <Input
                        type="datetime-local"
                        value={reviewItemForm.dueDate}
                        onChange={(e) => setReviewItemForm((c) => ({ ...c, dueDate: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <Input
                        placeholder="Review notes…"
                        value={reviewItemForm.notes}
                        onChange={(e) => setReviewItemForm((c) => ({ ...c, notes: e.target.value }))}
                      />
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border"
                          checked={reviewItemForm.highRisk}
                          onChange={(e) => setReviewItemForm((c) => ({ ...c, highRisk: e.target.checked }))}
                        />
                        Mark as high risk
                      </label>
                      <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border"
                          checked={reviewItemForm.reviewerConfirmed}
                          onChange={(e) => setReviewItemForm((c) => ({ ...c, reviewerConfirmed: e.target.checked }))}
                        />
                        Reviewer confirmed
                      </label>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button onClick={() => updateItemMutation.mutate()} disabled={updateItemMutation.isPending}>
                        {updateItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save review
                      </Button>
                    </div>

                    {complianceTimeline.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-2">Timeline</p>
                        <div className="space-y-1.5">
                          {complianceTimeline.map((event) => (
                            <div key={event.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-medium">{event.status}</span>
                              <span>{event.label}</span>
                              <span>·</span>
                              <span>{formatDateTime(event.at)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Templates section */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-foreground">Compliance templates</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Project-level templates. Apply them to auto-generate compliance items for this subcontractor.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setActiveModal("create-template")} disabled={!projectId}>
                  New template
                </Button>
                <Button
                  size="sm"
                  onClick={() => applyTemplatesMutation.mutate()}
                  disabled={applyTemplatesMutation.isPending || !projectId || templates.length === 0}
                >
                  {applyTemplatesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Apply templates
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Due date override (optional)</Label>
                <Popover open={isDueDatePickerOpen} onOpenChange={setIsDueDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={`h-10 min-w-[240px] justify-start rounded-lg border-border/70 bg-background text-left font-medium shadow-sm ${!applyDueDateOverrideDate ? "text-muted-foreground" : "text-foreground"}`}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {applyDueDateOverrideDate
                        ? applyDueDateOverrideDate.toLocaleDateString()
                        : "Pick a due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto rounded-xl border border-border/70 bg-popover p-2 shadow-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={applyDueDateOverrideDate}
                      onSelect={(date) => {
                        if (!date) {
                          setApplyDueDateOverride("");
                          setIsDueDatePickerOpen(false);
                          return;
                        }

                        const normalizedDate = new Date(
                          date.getFullYear(),
                          date.getMonth(),
                          date.getDate(),
                          12,
                          0,
                          0,
                          0,
                        );
                        setApplyDueDateOverride(normalizedDate.toISOString());
                        setIsDueDatePickerOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {applyDueDateOverride && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setApplyDueDateOverride("");
                    setIsDueDatePickerOpen(false);
                  }}
                  className="h-9 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>

            {!projectId && (
              <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Assign this subcontractor to a project to manage templates.
              </p>
            )}

            <DataTable
              columns={templateColumns}
              data={templates}
              isLoading={templatesQuery.isLoading}
              rowKey={(row) => row.id}
              onRowClick={(row) => { setSelectedTemplateId(row.id); setActiveModal("edit-template"); }}
              emptyState={
                <EmptyState icon={ClipboardList} title="No templates" description="Create templates for repeatable compliance onboarding." />
              }
            />
          </div>
        </div>
      )}

      {/* ── FINANCIAL TAB ────────────────────────────────────────────── */}
      {activeTab === "financial" && (
        <div className={selectedPayApp ? "grid gap-6 xl:grid-cols-2" : "space-y-4"}>
          {/* Pay applications list */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Pay applications</h2>
            <DataTable
              columns={payColumns}
              data={payApps}
              isLoading={payApplicationsQuery.isLoading}
              rowKey={(row) => row.id}
              onRowClick={(row) =>
                setSelectedPayApplicationId((currentId) =>
                  currentId === row.id ? "" : row.id,
                )
              }
              emptyState={
                <EmptyState icon={ClipboardCheck} title="No pay applications" description="Waiting for subcontractor submissions." />
              }
            />
          </div>

          {/* Pay app detail + review */}
          {selectedPayApp && (
            <div className="rounded-xl bg-card border border-border/70 p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Review pay application
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedPayApplicationId("")}
                  aria-label="Close pay application review"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Summary */}
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold text-foreground text-base">
                      {formatCents(selectedPayApp.totalAmountCents, selectedPayApp.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Period</span>
                    <span className="text-foreground text-xs">
                      {new Date(selectedPayApp.periodStart).toLocaleDateString()} – {new Date(selectedPayApp.periodEnd).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge status={selectedPayApp.status} />
                  </div>
                  {selectedPayApp.summary && (
                    <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">{selectedPayApp.summary}</p>
                  )}
                </div>

                {/* Line items */}
                {selectedPayApp.lineItems.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">Line items ({selectedPayApp.lineItems.length})</p>
                    <div className="rounded-lg border border-border/60 divide-y divide-border/40 text-xs">
                      {selectedPayApp.lineItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between px-3 py-2 gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground font-medium truncate">{item.description}</p>
                            {item.costCode && <p className="text-muted-foreground">{item.costCode}</p>}
                          </div>
                          <span className="font-medium text-foreground shrink-0">
                            {formatCents(item.amountCents, selectedPayApp.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review form */}
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <p className="text-xs font-medium text-foreground">Submit review decision</p>

                  <div className="space-y-1.5">
                    <Label>Decision</Label>
                    <Select
                      value={payReviewForm.status}
                      onValueChange={(v) => setPayReviewForm((c) => ({ ...c, status: v as typeof payReviewForm.status }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under_review">Under review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {payReviewForm.status === "rejected" && (
                    <div className="space-y-1.5">
                      <Label>Rejection reason</Label>
                      <Input
                        placeholder="Reason for rejection…"
                        value={payReviewForm.reason}
                        onChange={(e) => setPayReviewForm((c) => ({ ...c, reason: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label>Reviewer notes</Label>
                    <Input
                      placeholder="Internal notes…"
                      value={payReviewForm.reviewerNotes}
                      onChange={(e) => setPayReviewForm((c) => ({ ...c, reviewerNotes: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => reviewPayMutation.mutate()} disabled={reviewPayMutation.isPending}>
                      {reviewPayMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit review
                    </Button>
                  </div>
                </div>

                {/* Timeline */}
                {payTimeline.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">Timeline</p>
                    <div className="space-y-1.5">
                      {payTimeline.map((event) => (
                        <div key={event.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-medium">{event.status}</span>
                          <span>{formatDateTime(event.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── WORK LOGS TAB ────────────────────────────────────────────── */}
      {activeTab === "logs" && (
        <div className={selectedDailyLog ? "grid gap-6 xl:grid-cols-2" : "space-y-4"}>
          {/* Daily logs list */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Daily work logs</h2>
            <DataTable
              columns={dailyColumns}
              data={dailyLogs}
              isLoading={dailyLogsQuery.isLoading}
              rowKey={(row) => row.id}
              onRowClick={(row) =>
                setSelectedDailyLogId((currentId) =>
                  currentId === row.id ? "" : row.id,
                )
              }
              emptyState={
                <EmptyState icon={ClipboardList} title="No work logs" description="Waiting for field submissions." />
              }
            />
          </div>

          {/* Daily log detail + review */}
          {selectedDailyLog && (
            <div className="rounded-xl bg-card border border-border/70 p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {`Log — ${new Date(selectedDailyLog.logDate).toLocaleDateString()}`}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedDailyLogId("")}
                  aria-label="Close work log review"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Log summary */}
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="text-foreground">{new Date(selectedDailyLog.logDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Labor count</span>
                    <span className="font-semibold text-foreground">{selectedDailyLog.laborCount} workers</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Review status</span>
                    <StatusBadge status={selectedDailyLog.reviewStatus} />
                  </div>
                  <div className="pt-1 border-t border-border/50">
                    <p className="text-xs font-medium text-foreground mb-1">Work performed</p>
                    <p className="text-xs text-muted-foreground">{selectedDailyLog.performedWork}</p>
                  </div>
                  {selectedDailyLog.equipmentUsed && selectedDailyLog.equipmentUsed.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">Equipment used</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedDailyLog.equipmentUsed.map((eq) => (
                          <span key={eq} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{eq}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Review form */}
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <p className="text-xs font-medium text-foreground">Submit review decision</p>

                  <div className="space-y-1.5">
                    <Label>Decision</Label>
                    <Select
                      value={dailyReviewForm.reviewStatus}
                      onValueChange={(v) => setDailyReviewForm((c) => ({ ...c, reviewStatus: v as "reviewed" | "rejected" }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reviewed">Reviewed &amp; approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Review notes</Label>
                    <Input
                      placeholder="Add review notes…"
                      value={dailyReviewForm.reviewNotes}
                      onChange={(e) => setDailyReviewForm((c) => ({ ...c, reviewNotes: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => reviewDailyLogMutation.mutate()} disabled={reviewDailyLogMutation.isPending}>
                      {reviewDailyLogMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit review
                    </Button>
                  </div>
                </div>

                {/* Timeline */}
                {dailyLogTimeline.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">Timeline</p>
                    <div className="space-y-1.5">
                      {dailyLogTimeline.map((event) => (
                        <div key={event.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-medium">{event.status}</span>
                          <span>{formatDateTime(event.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODALS / DRAWERS ─────────────────────────────────────────── */}

      {/* Edit subcontractor */}
      <FormDrawer
        open={activeModal === "edit"}
        onClose={() => setActiveModal("none")}
        title="Edit subcontractor"
        description="Update profile details."
        width="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActiveModal("none")}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select
              value={editForm.projectId || "none"}
              onValueChange={(v) => setEditForm((c) => ({ ...c, projectId: v === "none" ? "" : v }))}
            >
              <SelectTrigger className="h-10"><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not assigned</SelectItem>
                {editForm.projectId && !projectOptions.some((p) => p.id === editForm.projectId) && (
                  <SelectItem value={editForm.projectId}>Current: {editForm.projectId}</SelectItem>
                )}
                {projectOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={editForm.name} onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" placeholder="contact@vendor.com" value={editForm.email} onChange={(e) => setEditForm((c) => ({ ...c, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input placeholder="+1 555 0100" value={editForm.phone} onChange={(e) => setEditForm((c) => ({ ...c, phone: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Trade</Label>
            <Input value={editForm.trade} onChange={(e) => setEditForm((c) => ({ ...c, trade: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={editForm.status} onValueChange={(v) => setEditForm((c) => ({ ...c, status: v as SubcontractorStatus }))}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDrawer>

      {/* Invite to portal */}
      <FormDrawer
        open={activeModal === "invite"}
        onClose={() => setActiveModal("none")}
        title="Invite to portal"
        description={subcontractor ? `Send portal access to ${subcontractor.name}.` : "Send portal access."}
        width="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActiveModal("none")}>Cancel</Button>
            <Button onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send invite
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Invite email</Label>
            <Input type="email" placeholder="invite@vendor.com" value={inviteForm.email} onChange={(e) => setInviteForm((c) => ({ ...c, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={inviteForm.projectId || "none"} onValueChange={(v) => setInviteForm((c) => ({ ...c, projectId: v === "none" ? "" : v }))}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Use subcontractor project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Use subcontractor project</SelectItem>
                {projectOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assigned scope</Label>
            <Input placeholder="Scope description" value={inviteForm.assignedScope} onChange={(e) => setInviteForm((c) => ({ ...c, assignedScope: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Milestones</Label>
            <Input placeholder="Comma-separated" value={inviteForm.milestonesText} onChange={(e) => setInviteForm((c) => ({ ...c, milestonesText: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-foreground md:col-span-2 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 rounded border-border" checked={inviteForm.sendInviteEmail}
              onChange={(e) => setInviteForm((c) => ({ ...c, sendInviteEmail: e.target.checked }))} />
            Send invite email
          </label>
        </div>
      </FormDrawer>

      {/* Create compliance template */}
      <FormDrawer
        open={activeModal === "create-template"}
        onClose={() => setActiveModal("none")}
        title="New compliance template"
        description="Project-level template applied to subcontractors."
        width="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActiveModal("none")}>Cancel</Button>
            <Button onClick={() => createTemplateMutation.mutate()} disabled={createTemplateMutation.isPending || templateForm.name.trim().length < 2}>
              {createTemplateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create template
            </Button>
          </div>
        }
      >
        <TemplateForm form={templateForm} onChange={setTemplateForm} />
      </FormDrawer>

      {/* Edit compliance template */}
      <FormDrawer
        open={activeModal === "edit-template"}
        onClose={() => setActiveModal("none")}
        title="Edit compliance template"
        description="Update the selected compliance template."
        width="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActiveModal("none")}>Cancel</Button>
            <Button onClick={() => updateTemplateMutation.mutate()} disabled={updateTemplateMutation.isPending}>
              {updateTemplateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save template
            </Button>
          </div>
        }
      >
        <TemplateForm form={templateForm} onChange={setTemplateForm} />
      </FormDrawer>

      {/* Create compliance item */}
      <FormDrawer
        open={activeModal === "create-item"}
        onClose={() => setActiveModal("none")}
        title="Add compliance item"
        description="Manually add a compliance requirement for this subcontractor."
        width="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActiveModal("none")}>Cancel</Button>
            <Button onClick={() => createItemMutation.mutate()} disabled={createItemMutation.isPending || createItemForm.complianceType.trim().length < 2}>
              {createItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add item
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Compliance type</Label>
            <Input
              placeholder="e.g. General Liability, Workers Comp, Safety Cert…"
              value={createItemForm.complianceType}
              onChange={(e) => setCreateItemForm((c) => ({ ...c, complianceType: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Due date</Label>
            <Input type="datetime-local" value={createItemForm.dueDate} onChange={(e) => setCreateItemForm((c) => ({ ...c, dueDate: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input placeholder="Optional notes" value={createItemForm.notes} onChange={(e) => setCreateItemForm((c) => ({ ...c, notes: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-foreground md:col-span-2 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 rounded border-border" checked={createItemForm.highRisk}
              onChange={(e) => setCreateItemForm((c) => ({ ...c, highRisk: e.target.checked }))} />
            High risk item
          </label>
        </div>
      </FormDrawer>
    </div>
  );
}

// ── Small helper sub-component ───────────────────────────────────────────────

function ScoreRow({ label, value }: { label: string; value: number }) {
  const pct = value / 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

interface TemplateFormProps {
  form: {
    name: string;
    complianceType: string;
    defaultDueDays: string;
    required: boolean;
    highRisk: boolean;
  };
  onChange: React.Dispatch<React.SetStateAction<{
    name: string;
    complianceType: string;
    defaultDueDays: string;
    required: boolean;
    highRisk: boolean;
  }>>;
}

function TemplateForm({ form, onChange }: TemplateFormProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Template name</Label>
        <Input placeholder="e.g. General Liability Insurance" value={form.name} onChange={(e) => onChange((c) => ({ ...c, name: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label>Compliance type</Label>
        <Input placeholder="e.g. insurance, safety, certification" value={form.complianceType} onChange={(e) => onChange((c) => ({ ...c, complianceType: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label>Default due days</Label>
        <Input type="number" min="1" max="365" value={form.defaultDueDays} onChange={(e) => onChange((c) => ({ ...c, defaultDueDays: e.target.value }))} />
      </div>
      <div className="flex flex-col justify-end gap-3 pb-1">
        <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
          <input type="checkbox" className="h-4 w-4 rounded border-border" checked={form.required}
            onChange={(e) => onChange((c) => ({ ...c, required: e.target.checked }))} />
          Required for onboarding
        </label>
        <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
          <input type="checkbox" className="h-4 w-4 rounded border-border" checked={form.highRisk}
            onChange={(e) => onChange((c) => ({ ...c, highRisk: e.target.checked }))} />
          High risk item
        </label>
      </div>
    </div>
  );
}
