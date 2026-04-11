export type AccessRoleScope = "organization" | "project";

export interface PermissionDefinition {
  key: string;
  module: string;
  action: string;
  description: string;
}

export interface SystemRoleTemplate {
  code: string;
  name: string;
  scope: AccessRoleScope;
  description: string;
  permissions: string[];
}

export const permissionDefinitions: PermissionDefinition[] = [
  {
    key: "organization.read",
    module: "organization",
    action: "read",
    description: "View organization profile and metadata",
  },
  {
    key: "organization.update",
    module: "organization",
    action: "update",
    description: "Update organization settings",
  },
  {
    key: "organization.member.read",
    module: "organization",
    action: "member.read",
    description: "View organization members",
  },
  {
    key: "organization.member.manage",
    module: "organization",
    action: "member.manage",
    description: "Add, remove, and update organization members",
  },
  {
    key: "organization.team.read",
    module: "organization",
    action: "team.read",
    description: "View teams and team membership",
  },
  {
    key: "organization.team.manage",
    module: "organization",
    action: "team.manage",
    description: "Create teams and manage team membership",
  },
  {
    key: "organization.invitation.manage",
    module: "organization",
    action: "invitation.manage",
    description: "Create and revoke member invitations",
  },
  {
    key: "organization.access_control.read",
    module: "organization",
    action: "access_control.read",
    description: "View custom roles and permission assignments",
  },
  {
    key: "organization.access_control.manage",
    module: "organization",
    action: "access_control.manage",
    description: "Manage custom roles and permission assignments",
  },
  {
    key: "organization.delete",
    module: "organization",
    action: "delete",
    description: "Delete organization",
  },

  {
    key: "project.read",
    module: "project",
    action: "read",
    description: "View projects in the active organization",
  },
  {
    key: "project.create",
    module: "project",
    action: "create",
    description: "Create new projects",
  },
  {
    key: "project.update",
    module: "project",
    action: "update",
    description: "Update project details",
  },
  {
    key: "project.archive",
    module: "project",
    action: "archive",
    description: "Archive projects",
  },
  {
    key: "project.member.read",
    module: "project",
    action: "member.read",
    description: "View project membership",
  },
  {
    key: "project.member.manage",
    module: "project",
    action: "member.manage",
    description: "Manage project membership",
  },
  {
    key: "department.manage",
    module: "project",
    action: "department.manage",
    description: "Manage project departments and cost buckets",
  },

  {
    key: "rfq.read",
    module: "procurement",
    action: "rfq.read",
    description: "View RFQs",
  },
  {
    key: "rfq.create",
    module: "procurement",
    action: "rfq.create",
    description: "Create RFQs",
  },
  {
    key: "rfq.update",
    module: "procurement",
    action: "rfq.update",
    description: "Edit RFQs",
  },
  {
    key: "purchase_order.read",
    module: "procurement",
    action: "purchase_order.read",
    description: "View purchase orders",
  },
  {
    key: "purchase_order.create",
    module: "procurement",
    action: "purchase_order.create",
    description: "Create purchase orders",
  },
  {
    key: "purchase_order.update",
    module: "procurement",
    action: "purchase_order.update",
    description: "Edit purchase orders",
  },
  {
    key: "purchase_order.approve",
    module: "procurement",
    action: "purchase_order.approve",
    description: "Approve and close purchase orders",
  },
  {
    key: "invoice.read",
    module: "procurement",
    action: "invoice.read",
    description: "View invoices",
  },
  {
    key: "invoice.create",
    module: "procurement",
    action: "invoice.create",
    description: "Create invoices",
  },
  {
    key: "invoice.update",
    module: "procurement",
    action: "invoice.update",
    description: "Edit invoices",
  },
  {
    key: "invoice.approve",
    module: "procurement",
    action: "invoice.approve",
    description: "Approve and reject invoices",
  },
  {
    key: "receipt.read",
    module: "procurement",
    action: "receipt.read",
    description: "View receipts",
  },
  {
    key: "receipt.create",
    module: "procurement",
    action: "receipt.create",
    description: "Create receipts",
  },
  {
    key: "receipt.update",
    module: "procurement",
    action: "receipt.update",
    description: "Edit receipts",
  },
  {
    key: "match_run.read",
    module: "procurement",
    action: "match_run.read",
    description: "View matching run results",
  },
  {
    key: "match_run.execute",
    module: "procurement",
    action: "match_run.execute",
    description: "Run invoice/PO/receipt matching",
  },

  {
    key: "subcontractor.read",
    module: "subconnect",
    action: "subcontractor.read",
    description: "View subcontractors",
  },
  {
    key: "subcontractor.manage",
    module: "subconnect",
    action: "subcontractor.manage",
    description: "Manage subcontractor records and invitations",
  },
  {
    key: "compliance.read",
    module: "subconnect",
    action: "compliance.read",
    description: "View compliance items",
  },
  {
    key: "compliance.manage",
    module: "subconnect",
    action: "compliance.manage",
    description: "Manage compliance requirements and status",
  },
  {
    key: "pay_application.read",
    module: "subconnect",
    action: "pay_application.read",
    description: "View pay applications",
  },
  {
    key: "pay_application.review",
    module: "subconnect",
    action: "pay_application.review",
    description: "Review and update pay application status",
  },
  {
    key: "daily_log.read",
    module: "subconnect",
    action: "daily_log.read",
    description: "View subcontractor daily logs",
  },
  {
    key: "daily_log.review",
    module: "subconnect",
    action: "daily_log.review",
    description: "Review subcontractor daily logs",
  },
  {
    key: "portal_access.manage",
    module: "subconnect",
    action: "portal_access.manage",
    description: "Manage subcontractor portal credentials and access",
  },

  {
    key: "site_snap.read",
    module: "field_ops",
    action: "site_snap.read",
    description: "View SiteSnap records",
  },
  {
    key: "site_snap.create",
    module: "field_ops",
    action: "site_snap.create",
    description: "Create SiteSnap records",
  },
  {
    key: "site_snap.review",
    module: "field_ops",
    action: "site_snap.review",
    description: "Review SiteSnap analysis",
  },
  {
    key: "change_order.read",
    module: "field_ops",
    action: "change_order.read",
    description: "View change orders",
  },
  {
    key: "change_order.create",
    module: "field_ops",
    action: "change_order.create",
    description: "Create change orders",
  },
  {
    key: "change_order.decision",
    module: "field_ops",
    action: "change_order.decision",
    description: "Approve or reject change orders",
  },
  {
    key: "budget.read",
    module: "field_ops",
    action: "budget.read",
    description: "View budget dashboard and cost trends",
  },
  {
    key: "budget.manage",
    module: "field_ops",
    action: "budget.manage",
    description: "Manage budget settings, entries, and alerts",
  },

  {
    key: "smartmail.read",
    module: "communication",
    action: "smartmail.read",
    description: "View SmartMail threads and messages",
  },
  {
    key: "smartmail.send",
    module: "communication",
    action: "smartmail.send",
    description: "Send SmartMail messages",
  },
  {
    key: "smartmail.manage_templates",
    module: "communication",
    action: "smartmail.manage_templates",
    description: "Create and update SmartMail templates",
  },
  {
    key: "notification.read",
    module: "communication",
    action: "notification.read",
    description: "View notifications",
  },
  {
    key: "notification.manage",
    module: "communication",
    action: "notification.manage",
    description: "Manage notification delivery and state",
  },

  {
    key: "audit_log.read",
    module: "platform",
    action: "audit_log.read",
    description: "View audit log",
  },
  {
    key: "billing.read",
    module: "platform",
    action: "billing.read",
    description: "View billing records and subscriptions",
  },
  {
    key: "billing.manage",
    module: "platform",
    action: "billing.manage",
    description: "Create and update billing records",
  },
  {
    key: "integration.read",
    module: "platform",
    action: "integration.read",
    description: "View integration connections",
  },
  {
    key: "integration.manage",
    module: "platform",
    action: "integration.manage",
    description: "Manage integration connections",
  },
  {
    key: "storage.read",
    module: "platform",
    action: "storage.read",
    description: "Read file asset metadata",
  },
  {
    key: "storage.write",
    module: "platform",
    action: "storage.write",
    description: "Upload and manage file assets",
  },
  {
    key: "command_center.read",
    module: "platform",
    action: "command_center.read",
    description: "View command center analytics",
  },
  {
    key: "ai.generate",
    module: "platform",
    action: "ai.generate",
    description: "Use AI analysis and generation endpoints",
  },
];

export const allPermissionKeys = permissionDefinitions.map((item) => item.key);

const memberPermissions = [
  "organization.read",
  "organization.member.read",
  "organization.team.read",
  "project.read",
  "project.member.read",
  "rfq.read",
  "purchase_order.read",
  "invoice.read",
  "receipt.read",
  "match_run.read",
  "subcontractor.read",
  "compliance.read",
  "pay_application.read",
  "daily_log.read",
  "site_snap.read",
  "change_order.read",
  "budget.read",
  "smartmail.read",
  "notification.read",
  "storage.read",
  "command_center.read",
  "ai.generate",
];

const adminPermissions = allPermissionKeys.filter(
  (key) => key !== "organization.delete",
);

export const builtInOrgRolePermissions: Record<string, string[]> = {
  owner: allPermissionKeys,
  admin: adminPermissions,
  member: memberPermissions,
};

export const builtInProjectRolePermissions: Record<string, string[]> = {
  pm: [
    "project.read",
    "project.update",
    "project.member.read",
    "rfq.read",
    "rfq.create",
    "rfq.update",
    "purchase_order.read",
    "purchase_order.create",
    "purchase_order.update",
    "purchase_order.approve",
    "invoice.read",
    "invoice.create",
    "invoice.update",
    "invoice.approve",
    "receipt.read",
    "receipt.create",
    "receipt.update",
    "match_run.read",
    "match_run.execute",
    "subcontractor.read",
    "subcontractor.manage",
    "compliance.read",
    "compliance.manage",
    "pay_application.read",
    "pay_application.review",
    "daily_log.read",
    "daily_log.review",
    "site_snap.read",
    "site_snap.create",
    "site_snap.review",
    "change_order.read",
    "change_order.create",
    "change_order.decision",
    "budget.read",
    "budget.manage",
    "smartmail.read",
    "smartmail.send",
    "notification.read",
    "storage.read",
    "storage.write",
    "command_center.read",
    "ai.generate",
  ],
  field_supervisor: [
    "project.read",
    "project.member.read",
    "rfq.read",
    "purchase_order.read",
    "invoice.read",
    "receipt.read",
    "subcontractor.read",
    "compliance.read",
    "pay_application.read",
    "daily_log.read",
    "daily_log.review",
    "site_snap.read",
    "site_snap.create",
    "change_order.read",
    "change_order.create",
    "budget.read",
    "smartmail.read",
    "smartmail.send",
    "notification.read",
    "storage.read",
    "storage.write",
    "command_center.read",
    "ai.generate",
  ],
  viewer: [
    "project.read",
    "project.member.read",
    "rfq.read",
    "purchase_order.read",
    "invoice.read",
    "receipt.read",
    "match_run.read",
    "subcontractor.read",
    "compliance.read",
    "pay_application.read",
    "daily_log.read",
    "site_snap.read",
    "change_order.read",
    "budget.read",
    "smartmail.read",
    "notification.read",
    "storage.read",
    "command_center.read",
  ],
};

export const systemRoleTemplates: SystemRoleTemplate[] = [
  {
    code: "org_owner",
    name: "Organization Owner",
    scope: "organization",
    description: "System role mirroring Better Auth owner membership",
    permissions: builtInOrgRolePermissions.owner,
  },
  {
    code: "org_admin",
    name: "Organization Admin",
    scope: "organization",
    description: "System role mirroring Better Auth admin membership",
    permissions: builtInOrgRolePermissions.admin,
  },
  {
    code: "org_member",
    name: "Organization Member",
    scope: "organization",
    description: "System role mirroring Better Auth member membership",
    permissions: builtInOrgRolePermissions.member,
  },
  {
    code: "project_pm",
    name: "Project Manager",
    scope: "project",
    description: "System role mirroring project pm membership",
    permissions: builtInProjectRolePermissions.pm,
  },
  {
    code: "project_field_supervisor",
    name: "Field Supervisor",
    scope: "project",
    description: "System role mirroring project field supervisor membership",
    permissions: builtInProjectRolePermissions.field_supervisor,
  },
  {
    code: "project_viewer",
    name: "Project Viewer",
    scope: "project",
    description: "System role mirroring project viewer membership",
    permissions: builtInProjectRolePermissions.viewer,
  },
];

export function normalizePermissionKeys(permissionKeys: string[]) {
  return Array.from(new Set(permissionKeys)).sort();
}

export function permissionKeyExists(permissionKey: string) {
  return allPermissionKeys.includes(permissionKey);
}
