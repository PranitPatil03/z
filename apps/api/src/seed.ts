import {
  accessRoleAssignments,
  accessRolePermissions,
  accessRoles,
  accounts,
  auditLogs,
  billingRecords,
  budgetAlerts,
  budgetCostCodes,
  budgetCostEntries,
  budgetProjectSettings,
  changeOrders,
  complianceItems,
  complianceRequirementTemplates,
  dailyLogStatusEvents,
  dailyLogs,
  departments,
  fileAssets,
  integrations,
  invitations,
  invoices,
  matchRuns,
  members,
  notifications,
  organizationSubscriptions,
  organizations,
  payApplicationLineItems,
  payApplicationStatusEvents,
  payApplications,
  permissionCatalog,
  portalPasswordResetTokens,
  projectMembers,
  projects,
  purchaseOrders,
  receipts,
  rfqs,
  sessions,
  siteSnapImages,
  siteSnapObservations,
  siteSnaps,
  smartMailAccounts,
  smartMailMessages,
  smartMailSyncRuns,
  smartMailTemplates,
  smartMailThreads,
  stripeWebhookEvents,
  subcontractorInvitations,
  subcontractorPrequalificationScores,
  subcontractors,
  teamMembers,
  teams,
  usageEvents,
  users,
  verifications,
} from "@foreman/db";
import { hashPassword } from "better-auth/crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./database";
import { permissionDefinitions, systemRoleTemplates } from "./lib/permissions";

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function iso(date: Date) {
  return date.toISOString();
}

function ensureCurrency(value?: string | null) {
  return value ?? "USD";
}

type SeedUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
};

const seededUsers: SeedUser[] = [
  {
    id: "usr_summit_owner",
    email: "olivia.reed@summitbuild.com",
    name: "Olivia Reed",
    image: null,
  },
  {
    id: "usr_summit_admin",
    email: "marcus.lee@summitbuild.com",
    name: "Marcus Lee",
    image: null,
  },
  {
    id: "usr_summit_pm_harbor",
    email: "dana.patel@summitbuild.com",
    name: "Dana Patel",
    image: null,
  },
  {
    id: "usr_summit_pm_data",
    email: "kevin.ross@summitbuild.com",
    name: "Kevin Ross",
    image: null,
  },
  {
    id: "usr_summit_field_1",
    email: "juan.ramirez@summitbuild.com",
    name: "Juan Ramirez",
    image: null,
  },
  {
    id: "usr_summit_field_2",
    email: "lena.wong@summitbuild.com",
    name: "Lena Wong",
    image: null,
  },
  {
    id: "usr_summit_finance",
    email: "nina.cho@summitbuild.com",
    name: "Nina Cho",
    image: null,
  },
  {
    id: "usr_summit_safety",
    email: "aaron.price@summitbuild.com",
    name: "Aaron Price",
    image: null,
  },
  {
    id: "usr_summit_procurement",
    email: "rachel.kim@summitbuild.com",
    name: "Rachel Kim",
    image: null,
  },
  {
    id: "usr_northline_owner",
    email: "ethan.murphy@northlineinfra.com",
    name: "Ethan Murphy",
    image: null,
  },
  {
    id: "usr_northline_admin",
    email: "maria.garcia@northlineinfra.com",
    name: "Maria Garcia",
    image: null,
  },
  {
    id: "usr_northline_pm",
    email: "isaac.wilson@northlineinfra.com",
    name: "Isaac Wilson",
    image: null,
  },
  {
    id: "usr_shared_exec",
    email: "ceo@globalbuilders.example",
    name: "Avery Stone",
    image: null,
  },
];

function isLocalDatabaseUrl(value?: string) {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return (
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1") ||
    normalized.includes("0.0.0.0")
  );
}

async function resetDatabase() {
  await db.execute(
    sql.raw(`
TRUNCATE TABLE
  "usage_events",
  "organization_subscriptions",
  "file_assets",
  "smartmail_sync_runs",
  "smartmail_templates",
  "smartmail_messages",
  "smartmail_threads",
  "smartmail_accounts",
  "budget_alerts",
  "budget_cost_entries",
  "budget_project_settings",
  "budget_cost_codes",
  "change_orders",
  "site_snap_observations",
  "site_snap_images",
  "site_snaps",
  "integrations",
  "stripe_webhook_events",
  "billing_records",
  "notifications",
  "daily_log_status_events",
  "daily_logs",
  "pay_application_status_events",
  "pay_application_line_items",
  "pay_applications",
  "subcontractor_prequalification_scores",
  "portal_password_reset_tokens",
  "subcontractor_invitations",
  "compliance_requirement_templates",
  "compliance_items",
  "subcontractors",
  "match_runs",
  "receipts",
  "invoices",
  "purchase_orders",
  "rfqs",
  "audit_logs",
  "project_members",
  "departments",
  "projects",
  "access_role_assignments",
  "access_role_permissions",
  "access_roles",
  "permission_catalog",
  "team_member",
  "team",
  "invitation",
  "member",
  "organization",
  "verification",
  "account",
  "session",
  "user"
RESTART IDENTITY CASCADE;
  `),
  );
}

async function assertSeedSchemaReady() {
  const requiredTables = [
    "permission_catalog",
    "access_roles",
    "access_role_permissions",
    "access_role_assignments",
  ] as const;

  const tableRows = await db.execute<{ table_name: string }>(
    sql.raw(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('permission_catalog', 'access_roles', 'access_role_permissions', 'access_role_assignments')
    `),
  );

  const existingTableNames = new Set(
    tableRows.rows.map((row) => row.table_name),
  );
  const missingTables = requiredTables.filter(
    (tableName) => !existingTableNames.has(tableName),
  );

  if (missingTables.length > 0) {
    throw new Error(
      `Missing required tables for seeding: ${missingTables.join(", ")}. Run pnpm db:migrate from repo root, then retry seed.`,
    );
  }
}

async function shouldSkipAppendSeed() {
  const [existingSeedUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, "usr_summit_owner"))
    .limit(1);

  return Boolean(existingSeedUser);
}

function isBetterAuthPasswordHash(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const parts = value.split(":");
  return parts.length === 2 && Boolean(parts[0]) && Boolean(parts[1]);
}

async function reconcileSeedCredentialAccounts(seedUserRows: SeedUser[]) {
  const seedUserIds = seedUserRows.map((user) => user.id);

  const existingSeedUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, seedUserIds));

  if (existingSeedUsers.length === 0) {
    return {
      insertedAccounts: 0,
      updatedAccounts: 0,
    };
  }

  const existingUserIds = new Set(existingSeedUsers.map((user) => user.id));
  const seedUsersById = new Map(seedUserRows.map((user) => [user.id, user]));

  const credentialAccounts = await db
    .select({
      id: accounts.id,
      userId: accounts.userId,
      password: accounts.password,
    })
    .from(accounts)
    .where(
      and(
        eq(accounts.providerId, "credential"),
        inArray(accounts.userId, seedUserIds),
      ),
    );

  const accountByUserId = new Map(
    credentialAccounts.map((account) => [account.userId, account]),
  );

  const passwordHash = await hashPassword("Password123!");

  const missingAccountRows = seedUserIds
    .filter(
      (userId) => existingUserIds.has(userId) && !accountByUserId.has(userId),
    )
    .map((userId) => {
      const user = seedUsersById.get(userId);
      if (!user) {
        return null;
      }

      return {
        id: `acct_${user.id}`,
        providerId: "credential",
        accountId: user.email,
        userId: user.id,
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (missingAccountRows.length > 0) {
    await db
      .insert(accounts)
      .values(missingAccountRows)
      .onConflictDoNothing({
        target: [accounts.providerId, accounts.accountId],
      });
  }

  const invalidHashAccountIds = credentialAccounts
    .filter((account) => !isBetterAuthPasswordHash(account.password))
    .map((account) => account.id);

  if (invalidHashAccountIds.length > 0) {
    await db
      .update(accounts)
      .set({
        password: passwordHash,
        updatedAt: new Date(),
      })
      .where(inArray(accounts.id, invalidHashAccountIds));
  }

  return {
    insertedAccounts: missingAccountRows.length,
    updatedAccounts: invalidHashAccountIds.length,
  };
}

async function seedPermissions(
  organizationIds: string[],
  ownerByOrg: Record<string, string>,
) {
  await db
    .insert(permissionCatalog)
    .values(
      permissionDefinitions.map((definition) => ({
        key: definition.key,
        module: definition.module,
        action: definition.action,
        description: definition.description,
      })),
    )
    .onConflictDoNothing({
      target: permissionCatalog.key,
    });

  const roleRows = [] as Array<{
    id: string;
    organizationId: string;
    code: string;
    name: string;
    description: string;
    scope: "organization" | "project";
    isSystem: boolean;
    createdByUserId: string;
  }>;

  for (const organizationId of organizationIds) {
    const ownerId = ownerByOrg[organizationId];

    for (const template of systemRoleTemplates) {
      roleRows.push({
        id: `role_${organizationId}_${template.code}`,
        organizationId,
        code: template.code,
        name: template.name,
        description: template.description,
        scope: template.scope,
        isSystem: true,
        createdByUserId: ownerId,
      });
    }

    roleRows.push(
      {
        id: `role_${organizationId}_finance_manager`,
        organizationId,
        code: "finance_manager",
        name: "Finance Manager",
        description: "Controls AP workflows, approvals, and budget governance",
        scope: "organization",
        isSystem: false,
        createdByUserId: ownerId,
      },
      {
        id: `role_${organizationId}_safety_lead`,
        organizationId,
        code: "safety_lead",
        name: "Safety Compliance Lead",
        description: "Owns subcontractor compliance and safety remediation",
        scope: "organization",
        isSystem: false,
        createdByUserId: ownerId,
      },
      {
        id: `role_${organizationId}_procurement_specialist`,
        organizationId,
        code: "procurement_specialist",
        name: "Procurement Specialist",
        description:
          "Runs RFQ, PO, invoice and receipt workflows for assigned projects",
        scope: "project",
        isSystem: false,
        createdByUserId: ownerId,
      },
      {
        id: `role_${organizationId}_qa_qc_manager`,
        organizationId,
        code: "qa_qc_manager",
        name: "QA/QC Manager",
        description:
          "Reviews site observations, change requests, and field quality records",
        scope: "project",
        isSystem: false,
        createdByUserId: ownerId,
      },
    );
  }

  await db.insert(accessRoles).values(roleRows);

  const rolePermissionRows = [] as Array<{
    id: string;
    organizationId: string;
    roleId: string;
    permissionKey: string;
    granted: boolean;
  }>;

  for (const organizationId of organizationIds) {
    for (const template of systemRoleTemplates) {
      const roleId = `role_${organizationId}_${template.code}`;
      for (const permissionKey of template.permissions) {
        rolePermissionRows.push({
          id: `rp_${roleId}_${permissionKey.replaceAll(".", "_")}`,
          organizationId,
          roleId,
          permissionKey,
          granted: true,
        });
      }
    }

    const customPermissions: Record<string, string[]> = {
      [`role_${organizationId}_finance_manager`]: [
        "billing.read",
        "billing.manage",
        "invoice.read",
        "invoice.approve",
        "purchase_order.read",
        "purchase_order.approve",
        "budget.read",
        "budget.manage",
        "audit_log.read",
        "organization.access_control.read",
      ],
      [`role_${organizationId}_safety_lead`]: [
        "subcontractor.read",
        "subcontractor.manage",
        "compliance.read",
        "compliance.manage",
        "daily_log.read",
        "daily_log.review",
        "site_snap.read",
        "site_snap.review",
      ],
      [`role_${organizationId}_procurement_specialist`]: [
        "project.read",
        "rfq.read",
        "rfq.create",
        "rfq.update",
        "purchase_order.read",
        "purchase_order.create",
        "purchase_order.update",
        "invoice.read",
        "invoice.create",
        "invoice.update",
        "receipt.read",
        "receipt.create",
        "receipt.update",
        "match_run.read",
        "match_run.execute",
      ],
      [`role_${organizationId}_qa_qc_manager`]: [
        "project.read",
        "site_snap.read",
        "site_snap.create",
        "site_snap.review",
        "change_order.read",
        "change_order.create",
        "change_order.decision",
        "daily_log.read",
        "daily_log.review",
      ],
    };

    for (const [roleId, permissionKeys] of Object.entries(customPermissions)) {
      for (const permissionKey of permissionKeys) {
        rolePermissionRows.push({
          id: `rp_${roleId}_${permissionKey.replaceAll(".", "_")}`,
          organizationId,
          roleId,
          permissionKey,
          granted: true,
        });
      }
    }
  }

  await db.insert(accessRolePermissions).values(rolePermissionRows);
}

async function main() {
  const reset = !process.argv.includes("--no-reset");

  if (
    reset &&
    !isLocalDatabaseUrl(process.env.DATABASE_URL) &&
    process.env.ALLOW_REMOTE_SEED_RESET !== "true"
  ) {
    throw new Error(
      "Refusing to reset non-local DATABASE_URL. Use --no-reset, or set ALLOW_REMOTE_SEED_RESET=true when this is intentional.",
    );
  }

  await assertSeedSchemaReady();

  if (!reset) {
    const reconcileResult = await reconcileSeedCredentialAccounts(seededUsers);
    if (
      reconcileResult.insertedAccounts > 0 ||
      reconcileResult.updatedAccounts > 0
    ) {
      // eslint-disable-next-line no-console
      console.log(
        `Seed append repaired credential accounts (inserted: ${reconcileResult.insertedAccounts}, updated: ${reconcileResult.updatedAccounts}).`,
      );
    }
  }

  if (!reset && (await shouldSkipAppendSeed())) {
    // eslint-disable-next-line no-console
    console.log("Seed append skipped: baseline seed data already exists.");
    return;
  }

  if (reset) {
    await resetDatabase();
  }

  const passwordHash = await hashPassword("Password123!");

  const org1 = "org_summit_build";
  const org2 = "org_northline_infra";

  const userRows = seededUsers;

  await db.insert(users).values(
    userRows.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: true,
      createdAt: daysAgo(180),
      updatedAt: daysAgo(1),
    })),
  );

  await db.insert(accounts).values(
    userRows.map((user) => ({
      id: `acct_${user.id}`,
      providerId: "credential",
      accountId: user.email,
      userId: user.id,
      password: passwordHash,
      createdAt: daysAgo(180),
      updatedAt: daysAgo(1),
    })),
  );

  await db.insert(sessions).values([
    {
      id: "sess_summit_owner",
      userId: "usr_summit_owner",
      token: "seed-session-summit-owner",
      expiresAt: daysFromNow(30),
      ipAddress: "10.0.0.12",
      userAgent: "seed-script",
      activeOrganizationId: org1,
      activeTeamId: "team_summit_leadership",
      createdAt: daysAgo(3),
      updatedAt: daysAgo(1),
    },
    {
      id: "sess_northline_owner",
      userId: "usr_northline_owner",
      token: "seed-session-northline-owner",
      expiresAt: daysFromNow(30),
      ipAddress: "10.0.0.22",
      userAgent: "seed-script",
      activeOrganizationId: org2,
      activeTeamId: "team_northline_executive",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
    },
  ]);

  await db.insert(verifications).values([
    {
      id: "verif_pending_invite",
      identifier: "invitation:future.user@summitbuild.com",
      value: "pending-invite-token",
      expiresAt: daysFromNow(7),
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ]);

  await db.insert(organizations).values([
    {
      id: org1,
      name: "Summit Build Group",
      slug: "summit-build-group",
      logo: null,
      metadata: { region: "US-West", erp: "procore", portfolioSize: 12 },
      createdAt: daysAgo(365),
      updatedAt: daysAgo(1),
    },
    {
      id: org2,
      name: "Northline Infrastructure",
      slug: "northline-infrastructure",
      logo: null,
      metadata: { region: "US-Central", erp: "viewpoint", portfolioSize: 5 },
      createdAt: daysAgo(310),
      updatedAt: daysAgo(2),
    },
  ]);

  await db.insert(members).values([
    {
      id: "mem_summit_owner",
      organizationId: org1,
      userId: "usr_summit_owner",
      role: "owner",
      createdAt: daysAgo(300),
    },
    {
      id: "mem_summit_admin",
      organizationId: org1,
      userId: "usr_summit_admin",
      role: "admin",
      createdAt: daysAgo(260),
    },
    {
      id: "mem_summit_pm_harbor",
      organizationId: org1,
      userId: "usr_summit_pm_harbor",
      role: "member",
      createdAt: daysAgo(220),
    },
    {
      id: "mem_summit_pm_data",
      organizationId: org1,
      userId: "usr_summit_pm_data",
      role: "member",
      createdAt: daysAgo(210),
    },
    {
      id: "mem_summit_field_1",
      organizationId: org1,
      userId: "usr_summit_field_1",
      role: "member",
      createdAt: daysAgo(200),
    },
    {
      id: "mem_summit_field_2",
      organizationId: org1,
      userId: "usr_summit_field_2",
      role: "member",
      createdAt: daysAgo(190),
    },
    {
      id: "mem_summit_finance",
      organizationId: org1,
      userId: "usr_summit_finance",
      role: "member",
      createdAt: daysAgo(180),
    },
    {
      id: "mem_summit_safety",
      organizationId: org1,
      userId: "usr_summit_safety",
      role: "member",
      createdAt: daysAgo(170),
    },
    {
      id: "mem_summit_procurement",
      organizationId: org1,
      userId: "usr_summit_procurement",
      role: "member",
      createdAt: daysAgo(160),
    },
    {
      id: "mem_summit_exec",
      organizationId: org1,
      userId: "usr_shared_exec",
      role: "member",
      createdAt: daysAgo(150),
    },

    {
      id: "mem_north_owner",
      organizationId: org2,
      userId: "usr_northline_owner",
      role: "owner",
      createdAt: daysAgo(280),
    },
    {
      id: "mem_north_admin",
      organizationId: org2,
      userId: "usr_northline_admin",
      role: "admin",
      createdAt: daysAgo(250),
    },
    {
      id: "mem_north_pm",
      organizationId: org2,
      userId: "usr_northline_pm",
      role: "member",
      createdAt: daysAgo(200),
    },
    {
      id: "mem_north_exec",
      organizationId: org2,
      userId: "usr_shared_exec",
      role: "member",
      createdAt: daysAgo(150),
    },
  ]);

  await db.insert(invitations).values([
    {
      id: "invite_summit_controller",
      organizationId: org1,
      email: "controller@summitbuild.com",
      role: "admin",
      status: "pending",
      teamId: "team_summit_finance",
      inviterId: "usr_summit_admin",
      expiresAt: daysFromNow(6),
      createdAt: daysAgo(1),
    },
    {
      id: "invite_north_safety",
      organizationId: org2,
      email: "safety@northlineinfra.com",
      role: "member",
      status: "pending",
      teamId: "team_northline_field_ops",
      inviterId: "usr_northline_admin",
      expiresAt: daysFromNow(5),
      createdAt: daysAgo(2),
    },
  ]);

  await db.insert(teams).values([
    {
      id: "team_summit_leadership",
      organizationId: org1,
      name: "Leadership",
      createdAt: daysAgo(300),
      updatedAt: daysAgo(2),
    },
    {
      id: "team_summit_finance",
      organizationId: org1,
      name: "Finance Controls",
      createdAt: daysAgo(220),
      updatedAt: daysAgo(2),
    },
    {
      id: "team_summit_field_ops",
      organizationId: org1,
      name: "Field Operations",
      createdAt: daysAgo(220),
      updatedAt: daysAgo(1),
    },
    {
      id: "team_northline_executive",
      organizationId: org2,
      name: "Executive",
      createdAt: daysAgo(250),
      updatedAt: daysAgo(2),
    },
    {
      id: "team_northline_field_ops",
      organizationId: org2,
      name: "Field Operations",
      createdAt: daysAgo(230),
      updatedAt: daysAgo(3),
    },
  ]);

  await db.insert(teamMembers).values([
    {
      id: "tm_summit_owner",
      teamId: "team_summit_leadership",
      userId: "usr_summit_owner",
      createdAt: daysAgo(300),
    },
    {
      id: "tm_summit_admin",
      teamId: "team_summit_leadership",
      userId: "usr_summit_admin",
      createdAt: daysAgo(260),
    },
    {
      id: "tm_summit_finance",
      teamId: "team_summit_finance",
      userId: "usr_summit_finance",
      createdAt: daysAgo(180),
    },
    {
      id: "tm_summit_procurement",
      teamId: "team_summit_finance",
      userId: "usr_summit_procurement",
      createdAt: daysAgo(160),
    },
    {
      id: "tm_summit_field_1",
      teamId: "team_summit_field_ops",
      userId: "usr_summit_field_1",
      createdAt: daysAgo(200),
    },
    {
      id: "tm_summit_field_2",
      teamId: "team_summit_field_ops",
      userId: "usr_summit_field_2",
      createdAt: daysAgo(190),
    },
    {
      id: "tm_north_owner",
      teamId: "team_northline_executive",
      userId: "usr_northline_owner",
      createdAt: daysAgo(280),
    },
    {
      id: "tm_north_admin",
      teamId: "team_northline_executive",
      userId: "usr_northline_admin",
      createdAt: daysAgo(250),
    },
    {
      id: "tm_north_pm",
      teamId: "team_northline_field_ops",
      userId: "usr_northline_pm",
      createdAt: daysAgo(200),
    },
  ]);

  const projectRows = [
    {
      id: "proj_summit_harbor_tower",
      organizationId: org1,
      name: "Harbor Medical Tower Expansion",
      code: "HMT-2026",
      description: "28-story vertical expansion with phased commissioning.",
      status: "active" as const,
      startDate: daysAgo(140),
      endDate: daysFromNow(420),
      createdAt: daysAgo(145),
      updatedAt: daysAgo(1),
    },
    {
      id: "proj_summit_data_center",
      organizationId: org1,
      name: "Eastside Data Center Phase II",
      code: "EDC-P2",
      description: "Mission-critical MEP and envelope upgrade.",
      status: "active" as const,
      startDate: daysAgo(90),
      endDate: daysFromNow(280),
      createdAt: daysAgo(95),
      updatedAt: daysAgo(2),
    },
    {
      id: "proj_summit_school_retrofit",
      organizationId: org1,
      name: "Riverview School Retrofit",
      code: "RVS-RETRO",
      description: "Occupied school modernization with night-shift sequencing.",
      status: "active" as const,
      startDate: daysAgo(60),
      endDate: daysFromNow(180),
      createdAt: daysAgo(65),
      updatedAt: daysAgo(1),
    },
    {
      id: "proj_northline_transit_hub",
      organizationId: org2,
      name: "Riverfront Transit Hub",
      code: "RTH-01",
      description: "Intermodal station with complex utility relocations.",
      status: "active" as const,
      startDate: daysAgo(120),
      endDate: daysFromNow(360),
      createdAt: daysAgo(125),
      updatedAt: daysAgo(1),
    },
  ];

  await db.insert(projects).values(projectRows);

  const departmentRows = [
    {
      id: "dept_harbor_civil",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      name: "Civil & Structural",
      slug: "civil-structural",
      createdAt: daysAgo(140),
      updatedAt: daysAgo(2),
    },
    {
      id: "dept_harbor_mep",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      name: "MEP Systems",
      slug: "mep-systems",
      createdAt: daysAgo(140),
      updatedAt: daysAgo(1),
    },
    {
      id: "dept_data_shell",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      name: "Shell & Core",
      slug: "shell-core",
      createdAt: daysAgo(90),
      updatedAt: daysAgo(1),
    },
    {
      id: "dept_data_commissioning",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      name: "Commissioning",
      slug: "commissioning",
      createdAt: daysAgo(85),
      updatedAt: daysAgo(1),
    },
    {
      id: "dept_school_interiors",
      organizationId: org1,
      projectId: "proj_summit_school_retrofit",
      name: "Interiors",
      slug: "interiors",
      createdAt: daysAgo(60),
      updatedAt: daysAgo(1),
    },
    {
      id: "dept_transit_trackwork",
      organizationId: org2,
      projectId: "proj_northline_transit_hub",
      name: "Trackwork",
      slug: "trackwork",
      createdAt: daysAgo(120),
      updatedAt: daysAgo(1),
    },
    {
      id: "dept_transit_station",
      organizationId: org2,
      projectId: "proj_northline_transit_hub",
      name: "Station Finishes",
      slug: "station-finishes",
      createdAt: daysAgo(115),
      updatedAt: daysAgo(2),
    },
  ];

  await db.insert(departments).values(departmentRows);

  await db.insert(projectMembers).values([
    {
      id: "pm_harbor_dana",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      userId: "usr_summit_pm_harbor",
      role: "pm",
      departmentIds: ["dept_harbor_civil", "dept_harbor_mep"],
      createdAt: daysAgo(140),
      updatedAt: daysAgo(2),
    },
    {
      id: "pm_harbor_juan",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      userId: "usr_summit_field_1",
      role: "field_supervisor",
      departmentIds: ["dept_harbor_civil"],
      createdAt: daysAgo(138),
      updatedAt: daysAgo(2),
    },
    {
      id: "pm_harbor_procurement",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      userId: "usr_summit_procurement",
      role: "viewer",
      departmentIds: ["dept_harbor_mep"],
      createdAt: daysAgo(132),
      updatedAt: daysAgo(2),
    },

    {
      id: "pm_data_kevin",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      userId: "usr_summit_pm_data",
      role: "pm",
      departmentIds: ["dept_data_shell", "dept_data_commissioning"],
      createdAt: daysAgo(90),
      updatedAt: daysAgo(2),
    },
    {
      id: "pm_data_lena",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      userId: "usr_summit_field_2",
      role: "field_supervisor",
      departmentIds: ["dept_data_shell"],
      createdAt: daysAgo(88),
      updatedAt: daysAgo(1),
    },

    {
      id: "pm_school_dana",
      organizationId: org1,
      projectId: "proj_summit_school_retrofit",
      userId: "usr_summit_pm_harbor",
      role: "pm",
      departmentIds: ["dept_school_interiors"],
      createdAt: daysAgo(60),
      updatedAt: daysAgo(1),
    },
    {
      id: "pm_school_juan",
      organizationId: org1,
      projectId: "proj_summit_school_retrofit",
      userId: "usr_summit_field_1",
      role: "field_supervisor",
      departmentIds: ["dept_school_interiors"],
      createdAt: daysAgo(58),
      updatedAt: daysAgo(1),
    },

    {
      id: "pm_transit_isaac",
      organizationId: org2,
      projectId: "proj_northline_transit_hub",
      userId: "usr_northline_pm",
      role: "pm",
      departmentIds: ["dept_transit_trackwork", "dept_transit_station"],
      createdAt: daysAgo(120),
      updatedAt: daysAgo(1),
    },
  ]);

  await seedPermissions([org1, org2], {
    [org1]: "usr_summit_owner",
    [org2]: "usr_northline_owner",
  });

  await db.insert(accessRoleAssignments).values([
    {
      id: "assign_summit_finance",
      organizationId: org1,
      projectId: null,
      userId: "usr_summit_finance",
      roleId: `role_${org1}_finance_manager`,
      assignedByUserId: "usr_summit_owner",
      source: "manual",
      createdAt: daysAgo(70),
      updatedAt: daysAgo(70),
    },
    {
      id: "assign_summit_safety",
      organizationId: org1,
      projectId: null,
      userId: "usr_summit_safety",
      roleId: `role_${org1}_safety_lead`,
      assignedByUserId: "usr_summit_owner",
      source: "manual",
      createdAt: daysAgo(68),
      updatedAt: daysAgo(68),
    },
    {
      id: "assign_summit_procurement_harbor",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      userId: "usr_summit_procurement",
      roleId: `role_${org1}_procurement_specialist`,
      assignedByUserId: "usr_summit_admin",
      source: "manual",
      createdAt: daysAgo(62),
      updatedAt: daysAgo(62),
    },
    {
      id: "assign_summit_qaqc_data",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      userId: "usr_summit_field_2",
      roleId: `role_${org1}_qa_qc_manager`,
      assignedByUserId: "usr_summit_admin",
      source: "manual",
      createdAt: daysAgo(55),
      updatedAt: daysAgo(55),
    },
    {
      id: "assign_north_pm",
      organizationId: org2,
      projectId: "proj_northline_transit_hub",
      userId: "usr_northline_pm",
      roleId: `role_${org2}_project_pm`,
      assignedByUserId: "usr_northline_owner",
      source: "system-sync",
      createdAt: daysAgo(100),
      updatedAt: daysAgo(100),
    },
  ]);

  await db.insert(rfqs).values([
    {
      id: "rfq_harbor_steel",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      title: "Structural Steel Package",
      scope: "Supply and erect steel framing for levels 8-14",
      dueDate: daysFromNow(8),
      status: "sent",
      createdByUserId: "usr_summit_procurement",
      metadata: { bidders: 5, targetAwardDate: iso(daysFromNow(14)) },
      createdAt: daysAgo(6),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "rfq_data_ups",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      title: "UPS Battery Room Buildout",
      scope: "Install containment and battery racks for UPS expansion",
      dueDate: daysFromNow(12),
      status: "draft",
      createdByUserId: "usr_summit_procurement",
      metadata: { bidders: 3 },
      createdAt: daysAgo(4),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "rfq_transit_signage",
      organizationId: org2,
      projectId: "proj_northline_transit_hub",
      title: "Wayfinding Signage",
      scope: "Fabrication and install of ADA-compliant station signage",
      dueDate: daysFromNow(16),
      status: "sent",
      createdByUserId: "usr_northline_pm",
      metadata: { bidders: 4 },
      createdAt: daysAgo(5),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
  ]);

  await db.insert(purchaseOrders).values([
    {
      id: "po_harbor_steel",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      rfqId: "rfq_harbor_steel",
      poNumber: "PO-HMT-1024",
      vendorName: "Atlas Steel Works",
      currency: "USD",
      totalAmountCents: 24500000,
      status: "issued",
      issueDate: daysAgo(20),
      createdByUserId: "usr_summit_procurement",
      createdAt: daysAgo(20),
      updatedAt: daysAgo(2),
      deletedAt: null,
    },
    {
      id: "po_harbor_concrete",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      rfqId: null,
      poNumber: "PO-HMT-1028",
      vendorName: "Pacific Ready Mix",
      currency: "USD",
      totalAmountCents: 8900000,
      status: "approved",
      issueDate: daysAgo(15),
      createdByUserId: "usr_summit_procurement",
      createdAt: daysAgo(15),
      updatedAt: daysAgo(2),
      deletedAt: null,
    },
    {
      id: "po_data_hvac",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      rfqId: "rfq_data_ups",
      poNumber: "PO-EDC-2211",
      vendorName: "AeroFlow Mechanical",
      currency: "USD",
      totalAmountCents: 13200000,
      status: "issued",
      issueDate: daysAgo(10),
      createdByUserId: "usr_summit_procurement",
      createdAt: daysAgo(10),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "po_transit_signage",
      organizationId: org2,
      projectId: "proj_northline_transit_hub",
      rfqId: "rfq_transit_signage",
      poNumber: "PO-RTH-401",
      vendorName: "Metro Sign Systems",
      currency: "USD",
      totalAmountCents: 3100000,
      status: "issued",
      issueDate: daysAgo(9),
      createdByUserId: "usr_northline_pm",
      createdAt: daysAgo(9),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
  ]);

  await db.insert(invoices).values([
    {
      id: "inv_harbor_steel_01",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      purchaseOrderId: "po_harbor_steel",
      invoiceNumber: "INV-ASW-7781",
      vendorName: "Atlas Steel Works",
      currency: "USD",
      totalAmountCents: 6125000,
      status: "submitted",
      dueDate: daysFromNow(15),
      receivedAt: daysAgo(3),
      createdAt: daysAgo(3),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "inv_harbor_concrete_01",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      purchaseOrderId: "po_harbor_concrete",
      invoiceNumber: "INV-PRM-2140",
      vendorName: "Pacific Ready Mix",
      currency: "USD",
      totalAmountCents: 2225000,
      status: "approved",
      dueDate: daysFromNow(10),
      receivedAt: daysAgo(4),
      createdAt: daysAgo(4),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "inv_data_hvac_01",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      purchaseOrderId: "po_data_hvac",
      invoiceNumber: "INV-AFM-0092",
      vendorName: "AeroFlow Mechanical",
      currency: "USD",
      totalAmountCents: 2800000,
      status: "hold",
      dueDate: daysFromNow(5),
      receivedAt: daysAgo(2),
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "inv_transit_signage_01",
      organizationId: org2,
      projectId: "proj_northline_transit_hub",
      purchaseOrderId: "po_transit_signage",
      invoiceNumber: "INV-MSS-118",
      vendorName: "Metro Sign Systems",
      currency: "USD",
      totalAmountCents: 950000,
      status: "paid",
      dueDate: daysAgo(2),
      receivedAt: daysAgo(16),
      createdAt: daysAgo(16),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
  ]);

  await db.insert(receipts).values([
    {
      id: "rcpt_harbor_steel_01",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      purchaseOrderId: "po_harbor_steel",
      receiptNumber: "RCPT-HMT-5501",
      receivedAmountCents: 6000000,
      status: "verified",
      receivedAt: daysAgo(2),
      notes: "Mill certs uploaded",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "rcpt_harbor_concrete_01",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      purchaseOrderId: "po_harbor_concrete",
      receiptNumber: "RCPT-HMT-5512",
      receivedAmountCents: 2200000,
      status: "received",
      receivedAt: daysAgo(1),
      notes: "Pending compressive test report",
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "rcpt_data_hvac_01",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      purchaseOrderId: "po_data_hvac",
      receiptNumber: "RCPT-EDC-7790",
      receivedAmountCents: 2500000,
      status: "verified",
      receivedAt: daysAgo(1),
      notes: "Installed and tested",
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
  ]);

  await db.insert(matchRuns).values([
    {
      id: "match_harbor_steel_01",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      invoiceId: "inv_harbor_steel_01",
      purchaseOrderId: "po_harbor_steel",
      receiptId: "rcpt_harbor_steel_01",
      result: "partial_match",
      toleranceBps: 100,
      varianceCents: 125000,
      details: { invoice: 6125000, receipt: 6000000, poRemaining: 18375000 },
      createdByUserId: "usr_summit_finance",
      createdAt: daysAgo(1),
    },
    {
      id: "match_harbor_concrete_01",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      invoiceId: "inv_harbor_concrete_01",
      purchaseOrderId: "po_harbor_concrete",
      receiptId: "rcpt_harbor_concrete_01",
      result: "matched",
      toleranceBps: 100,
      varianceCents: 25000,
      details: { invoice: 2225000, receipt: 2200000, withinTolerance: true },
      createdByUserId: "usr_summit_finance",
      createdAt: daysAgo(1),
    },
    {
      id: "match_data_hvac_01",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      invoiceId: "inv_data_hvac_01",
      purchaseOrderId: "po_data_hvac",
      receiptId: "rcpt_data_hvac_01",
      result: "over_bill",
      toleranceBps: 50,
      varianceCents: 300000,
      details: {
        exceptionCode: "PRICE_VARIANCE",
        reviewer: "usr_summit_finance",
      },
      createdByUserId: "usr_summit_finance",
      createdAt: daysAgo(1),
    },
  ]);

  await db.insert(subcontractors).values([
    {
      id: "sub_harbor_atlas",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      name: "Atlas Steel Works",
      email: "portal@atlassteel.com",
      phone: "+1-415-555-1111",
      trade: "Structural Steel",
      status: "active",
      passwordHash: passwordHash,
      portalEnabled: true,
      lastPortalLoginAt: daysAgo(1),
      metadata: { insuranceTier: "A", onboardingDate: iso(daysAgo(200)) },
      createdAt: daysAgo(220),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "sub_harbor_pacific",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      name: "Pacific Ready Mix",
      email: "compliance@pacificmix.com",
      phone: "+1-415-555-1222",
      trade: "Concrete",
      status: "active",
      passwordHash: passwordHash,
      portalEnabled: true,
      lastPortalLoginAt: daysAgo(2),
      metadata: { insuranceTier: "B" },
      createdAt: daysAgo(210),
      updatedAt: daysAgo(2),
      deletedAt: null,
    },
    {
      id: "sub_data_aeroflow",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      name: "AeroFlow Mechanical",
      email: "pm@aeroflowmech.com",
      phone: "+1-650-555-1888",
      trade: "Mechanical",
      status: "active",
      passwordHash: passwordHash,
      portalEnabled: true,
      lastPortalLoginAt: daysAgo(3),
      metadata: { safetyIncidentsLastYear: 0 },
      createdAt: daysAgo(150),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "sub_transit_metro",
      organizationId: org2,
      projectId: "proj_northline_transit_hub",
      name: "Metro Sign Systems",
      email: "admin@metrosign.io",
      phone: "+1-312-555-3221",
      trade: "Signage",
      status: "active",
      passwordHash: passwordHash,
      portalEnabled: true,
      lastPortalLoginAt: daysAgo(2),
      metadata: { smallBusiness: true },
      createdAt: daysAgo(140),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
  ]);

  await db.insert(complianceRequirementTemplates).values([
    {
      id: "crt_harbor_insurance",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      name: "General Liability Insurance",
      complianceType: "insurance_gl",
      defaultDueDays: 30,
      required: true,
      highRisk: true,
      metadata: { minCoverageUsd: 5000000 },
      createdByUserId: "usr_summit_safety",
      createdAt: daysAgo(120),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "crt_harbor_safety_plan",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      name: "Site Safety Plan",
      complianceType: "safety_plan",
      defaultDueDays: 14,
      required: true,
      highRisk: true,
      metadata: { reviewCadenceDays: 30 },
      createdByUserId: "usr_summit_safety",
      createdAt: daysAgo(118),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "crt_data_certifications",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      name: "Mission Critical Installer Certifications",
      complianceType: "installer_cert",
      defaultDueDays: 21,
      required: true,
      highRisk: false,
      metadata: { certBodies: ["ASHRAE", "NFPA"] },
      createdByUserId: "usr_summit_safety",
      createdAt: daysAgo(80),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
  ]);

  await db.insert(complianceItems).values([
    {
      id: "comp_atlas_insurance",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      subcontractorId: "sub_harbor_atlas",
      complianceType: "insurance_gl",
      status: "verified",
      highRisk: true,
      dueDate: daysFromNow(20),
      reminderSentAt: daysAgo(2),
      escalationSentAt: null,
      reviewerConfirmedAt: daysAgo(1),
      reviewerConfirmedByUserId: "usr_summit_safety",
      notes: "Policy verified against broker letter.",
      evidence: {
        fileAssetId: "fa_atlas_insurance",
        policyNumber: "GL-0029181",
      },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "comp_pacific_safety",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      subcontractorId: "sub_harbor_pacific",
      complianceType: "safety_plan",
      status: "expiring",
      highRisk: true,
      dueDate: daysFromNow(4),
      reminderSentAt: daysAgo(1),
      escalationSentAt: null,
      reviewerConfirmedAt: null,
      reviewerConfirmedByUserId: null,
      notes: "Awaiting refreshed hazard analysis.",
      evidence: { lastSubmissionAt: iso(daysAgo(31)) },
      createdAt: daysAgo(32),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "comp_data_cert",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      subcontractorId: "sub_data_aeroflow",
      complianceType: "installer_cert",
      status: "pending",
      highRisk: false,
      dueDate: daysFromNow(7),
      reminderSentAt: null,
      escalationSentAt: null,
      reviewerConfirmedAt: null,
      reviewerConfirmedByUserId: null,
      notes: "Awaiting QA upload from vendor.",
      evidence: { missing: ["NFPA-70E", "ASHRAE-90.1"] },
      createdAt: daysAgo(10),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
  ]);

  await db.insert(subcontractorInvitations).values([
    {
      id: "subinv_harbor_atlas",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      subcontractorId: "sub_harbor_atlas",
      invitedByUserId: "usr_summit_admin",
      email: "portal@atlassteel.com",
      tokenHash: "tokenhash-atlas-portal",
      status: "accepted",
      assignedScope: "Steel package milestones and pay app workflow",
      milestones: ["shop-drawings", "erection-phase-1", "closeout"],
      metadata: { acceptedIp: "198.51.100.10" },
      invitedAt: daysAgo(120),
      expiresAt: daysAgo(113),
      acceptedAt: daysAgo(118),
      createdAt: daysAgo(120),
      updatedAt: daysAgo(118),
    },
    {
      id: "subinv_data_aeroflow",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      subcontractorId: "sub_data_aeroflow",
      invitedByUserId: "usr_summit_admin",
      email: "pm@aeroflowmech.com",
      tokenHash: "tokenhash-aeroflow-portal",
      status: "pending",
      assignedScope: "Mechanical room install and TAB evidence",
      milestones: ["equipment-delivery", "startup", "commissioning"],
      metadata: { reminderCount: 1 },
      invitedAt: daysAgo(5),
      expiresAt: daysFromNow(2),
      acceptedAt: null,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(1),
    },
  ]);

  await db.insert(portalPasswordResetTokens).values([
    {
      id: "prt_atlas_recent",
      organizationId: org1,
      subcontractorId: "sub_harbor_atlas",
      tokenHash: "reset-token-atlas-1",
      requestedAt: daysAgo(6),
      expiresAt: daysAgo(5),
      usedAt: daysAgo(5),
      metadata: { channel: "email" },
      createdAt: daysAgo(6),
      updatedAt: daysAgo(5),
    },
    {
      id: "prt_data_pending",
      organizationId: org1,
      subcontractorId: "sub_data_aeroflow",
      tokenHash: "reset-token-aeroflow-1",
      requestedAt: daysAgo(1),
      expiresAt: daysFromNow(1),
      usedAt: null,
      metadata: { channel: "email" },
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ]);

  await db.insert(subcontractorPrequalificationScores).values([
    {
      id: "pq_atlas",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      subcontractorId: "sub_harbor_atlas",
      overallScoreBps: 8700,
      safetyScoreBps: 9100,
      financialScoreBps: 8500,
      complianceScoreBps: 9000,
      capacityScoreBps: 8200,
      riskLevel: "low",
      modelVersion: "v3.2",
      notes: "Strong historic performance and no serious incidents.",
      metadata: { analyst: "risk-engine" },
      scoredByUserId: "usr_summit_safety",
      createdAt: daysAgo(28),
      updatedAt: daysAgo(1),
    },
    {
      id: "pq_aeroflow",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      subcontractorId: "sub_data_aeroflow",
      overallScoreBps: 7600,
      safetyScoreBps: 7900,
      financialScoreBps: 7200,
      complianceScoreBps: 7400,
      capacityScoreBps: 7700,
      riskLevel: "medium",
      modelVersion: "v3.2",
      notes: "Capacity constrained in Q3 but acceptable with supervision.",
      metadata: { analyst: "risk-engine" },
      scoredByUserId: "usr_summit_safety",
      createdAt: daysAgo(14),
      updatedAt: daysAgo(1),
    },
  ]);

  await db.insert(payApplications).values([
    {
      id: "pa_atlas_2026_03",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      subcontractorId: "sub_harbor_atlas",
      periodStart: daysAgo(40),
      periodEnd: daysAgo(10),
      status: "approved",
      totalAmountCents: 4200000,
      currency: "USD",
      summary: "Steel erection progress billing for core and shell",
      evidence: { photos: 12, docs: 5 },
      rejectionReason: null,
      submittedAt: daysAgo(9),
      reviewedAt: daysAgo(6),
      reviewerUserId: "usr_summit_pm_harbor",
      metadata: { retainageBps: 1000 },
      createdAt: daysAgo(9),
      updatedAt: daysAgo(6),
      deletedAt: null,
    },
    {
      id: "pa_aeroflow_2026_03",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      subcontractorId: "sub_data_aeroflow",
      periodStart: daysAgo(35),
      periodEnd: daysAgo(5),
      status: "under_review",
      totalAmountCents: 1800000,
      currency: "USD",
      summary: "HVAC rough-in and startup prep",
      evidence: { photos: 8, docs: 3 },
      rejectionReason: null,
      submittedAt: daysAgo(4),
      reviewedAt: null,
      reviewerUserId: null,
      metadata: { pendingQuestions: 2 },
      createdAt: daysAgo(4),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
  ]);

  await db.insert(payApplicationLineItems).values([
    {
      id: "pali_atlas_1",
      payApplicationId: "pa_atlas_2026_03",
      description: "Steel column fabrication and install",
      costCode: "03-3000",
      quantityUnits: 1,
      unitAmountCents: 2800000,
      amountCents: 2800000,
      evidence: { uploadedBy: "sub_harbor_atlas" },
      metadata: { phase: "levels-8-12" },
      createdAt: daysAgo(9),
      updatedAt: daysAgo(9),
    },
    {
      id: "pali_atlas_2",
      payApplicationId: "pa_atlas_2026_03",
      description: "Temporary bracing and crane time",
      costCode: "03-9000",
      quantityUnits: 1,
      unitAmountCents: 1400000,
      amountCents: 1400000,
      evidence: { logs: 4 },
      metadata: { phase: "support" },
      createdAt: daysAgo(9),
      updatedAt: daysAgo(9),
    },
    {
      id: "pali_aeroflow_1",
      payApplicationId: "pa_aeroflow_2026_03",
      description: "AHU rigging and placement",
      costCode: "23-7313",
      quantityUnits: 1,
      unitAmountCents: 1800000,
      amountCents: 1800000,
      evidence: { commissioningDocs: false },
      metadata: { holdbackReason: "startup-docs" },
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
  ]);

  await db.insert(payApplicationStatusEvents).values([
    {
      id: "paevt_atlas_submitted",
      payApplicationId: "pa_atlas_2026_03",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      subcontractorId: "sub_harbor_atlas",
      status: "submitted",
      actorType: "subcontractor",
      actorId: "sub_harbor_atlas",
      reason: null,
      metadata: { viaPortal: true },
      createdAt: daysAgo(9),
    },
    {
      id: "paevt_atlas_approved",
      payApplicationId: "pa_atlas_2026_03",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      subcontractorId: "sub_harbor_atlas",
      status: "approved",
      actorType: "internal_user",
      actorId: "usr_summit_pm_harbor",
      reason: "Progress and evidence validated",
      metadata: { retainageHeld: 420000 },
      createdAt: daysAgo(6),
    },
    {
      id: "paevt_aeroflow_submitted",
      payApplicationId: "pa_aeroflow_2026_03",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      subcontractorId: "sub_data_aeroflow",
      status: "submitted",
      actorType: "subcontractor",
      actorId: "sub_data_aeroflow",
      reason: null,
      metadata: { viaPortal: true },
      createdAt: daysAgo(4),
    },
    {
      id: "paevt_aeroflow_review",
      payApplicationId: "pa_aeroflow_2026_03",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      subcontractorId: "sub_data_aeroflow",
      status: "under_review",
      actorType: "internal_user",
      actorId: "usr_summit_pm_data",
      reason: "Awaiting startup checklist",
      metadata: { checklistMissing: true },
      createdAt: daysAgo(2),
    },
  ]);

  await db.insert(dailyLogs).values([
    {
      id: "dl_harbor_atlas_2026_04_01",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      subcontractorId: "sub_harbor_atlas",
      logDate: daysAgo(2),
      laborCount: 34,
      equipmentUsed: ["crawler-crane", "scissor-lift"],
      performedWork: "Installed columns at grid F and connected deck framing.",
      attachments: [
        "photo://harbor/atlas/0401-1",
        "photo://harbor/atlas/0401-2",
      ],
      reviewStatus: "reviewed",
      reviewNotes: "No safety deviations observed.",
      reviewerUserId: "usr_summit_field_1",
      submittedAt: daysAgo(2),
      reviewedAt: daysAgo(1),
      metadata: { weather: "clear" },
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "dl_data_aeroflow_2026_04_02",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      subcontractorId: "sub_data_aeroflow",
      logDate: daysAgo(1),
      laborCount: 18,
      equipmentUsed: ["forklift", "vacuum-lift"],
      performedWork: "Set AHU-3 and started vibration isolation installs.",
      attachments: ["photo://data/aeroflow/0402-1"],
      reviewStatus: "pending",
      reviewNotes: null,
      reviewerUserId: null,
      submittedAt: daysAgo(1),
      reviewedAt: null,
      metadata: { weather: "windy" },
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
  ]);

  await db.insert(dailyLogStatusEvents).values([
    {
      id: "dlevt_harbor_submitted",
      dailyLogId: "dl_harbor_atlas_2026_04_01",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      subcontractorId: "sub_harbor_atlas",
      status: "pending",
      actorType: "subcontractor",
      actorId: "sub_harbor_atlas",
      reason: null,
      metadata: { viaPortal: true },
      createdAt: daysAgo(2),
    },
    {
      id: "dlevt_harbor_reviewed",
      dailyLogId: "dl_harbor_atlas_2026_04_01",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      subcontractorId: "sub_harbor_atlas",
      status: "reviewed",
      actorType: "internal_user",
      actorId: "usr_summit_field_1",
      reason: "Accepted",
      metadata: { noActionRequired: true },
      createdAt: daysAgo(1),
    },
  ]);

  await db.insert(siteSnaps).values([
    {
      id: "snap_harbor_core",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      createdByUserId: "usr_summit_field_1",
      notes: "Core wall pour progress - level 11",
      locationZone: "Tower Core - L11",
      status: "reviewed",
      analysisState: "completed",
      analysisJobId: "job-sitesnap-001",
      reviewedAt: daysAgo(1),
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
    },
    {
      id: "snap_data_rooftop",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      createdByUserId: "usr_summit_field_2",
      notes: "Rooftop condenser pad prep",
      locationZone: "Roof South Quadrant",
      status: "analyzing",
      analysisState: "running",
      analysisJobId: "job-sitesnap-014",
      reviewedAt: null,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ]);

  await db.insert(siteSnapImages).values([
    {
      id: "snapimg_harbor_1",
      snapId: "snap_harbor_core",
      imageUrl: "https://cdn.foreman.local/seed/site-snaps/harbor-core-1.jpg",
      position: 0,
      createdAt: daysAgo(2),
    },
    {
      id: "snapimg_harbor_2",
      snapId: "snap_harbor_core",
      imageUrl: "https://cdn.foreman.local/seed/site-snaps/harbor-core-2.jpg",
      position: 1,
      createdAt: daysAgo(2),
    },
    {
      id: "snapimg_data_1",
      snapId: "snap_data_rooftop",
      imageUrl: "https://cdn.foreman.local/seed/site-snaps/data-roof-1.jpg",
      position: 0,
      createdAt: daysAgo(1),
    },
  ]);

  await db.insert(siteSnapObservations).values([
    {
      id: "obs_harbor_progress",
      snapId: "snap_harbor_core",
      category: "work_progress",
      confidenceBps: 9300,
      detail: "Wall formwork at gridlines C-E complete and rebar cage staged.",
      source: "ai",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      id: "obs_harbor_safety",
      snapId: "snap_harbor_core",
      category: "safety_issue",
      confidenceBps: 8100,
      detail:
        "One untagged cable run near active lift zone requires barricade.",
      source: "ai",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      id: "obs_data_material",
      snapId: "snap_data_rooftop",
      category: "material_present",
      confidenceBps: 8700,
      detail: "Condenser mounts and anti-vibration kits delivered on-site.",
      source: "ai",
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ]);

  await db.insert(changeOrders).values([
    {
      id: "co_harbor_chiller",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      title: "Add Chiller Redundancy Loop",
      reason: "Owner directive after resiliency review",
      impactCostCents: 1850000,
      impactDays: 14,
      status: "under_review",
      pipelineStage: "executive_review",
      deadlineAt: daysFromNow(5),
      submittedAt: daysAgo(2),
      resolvedAt: null,
      createdByUserId: "usr_summit_pm_harbor",
      decidedByUserId: null,
      metadata: { impactedSystems: ["MEP", "controls"] },
      createdAt: daysAgo(3),
      updatedAt: daysAgo(1),
    },
    {
      id: "co_data_switchgear",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      title: "Switchgear Clearance Adjustment",
      reason: "As-built utility conflict",
      impactCostCents: 620000,
      impactDays: 5,
      status: "approved",
      pipelineStage: "approved",
      deadlineAt: daysAgo(1),
      submittedAt: daysAgo(10),
      resolvedAt: daysAgo(4),
      createdByUserId: "usr_summit_pm_data",
      decidedByUserId: "usr_summit_admin",
      metadata: { approvedBy: "board" },
      createdAt: daysAgo(11),
      updatedAt: daysAgo(4),
    },
    {
      id: "co_transit_signage_route",
      organizationId: org2,
      projectId: "proj_northline_transit_hub",
      title: "Concourse Signage Routing Revision",
      reason: "ADA review comments",
      impactCostCents: 230000,
      impactDays: 3,
      status: "submitted",
      pipelineStage: "submitted",
      deadlineAt: daysFromNow(4),
      submittedAt: daysAgo(1),
      resolvedAt: null,
      createdByUserId: "usr_northline_pm",
      decidedByUserId: null,
      metadata: { reviewer: "city-inspector" },
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
    },
  ]);

  await db.insert(budgetCostCodes).values([
    {
      id: "bcc_harbor_033000",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      code: "03-3000",
      name: "Cast-in-Place Concrete",
      budgetCents: 14500000,
      committedCents: 9800000,
      actualCents: 9100000,
      billedCents: 8600000,
      alertThresholdBps: 800,
      createdAt: daysAgo(120),
      updatedAt: daysAgo(1),
    },
    {
      id: "bcc_harbor_055000",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      code: "05-5000",
      name: "Metal Fabrications",
      budgetCents: 19800000,
      committedCents: 15000000,
      actualCents: 13200000,
      billedCents: 10800000,
      alertThresholdBps: 700,
      createdAt: daysAgo(118),
      updatedAt: daysAgo(1),
    },
    {
      id: "bcc_data_237313",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      code: "23-7313",
      name: "HVAC Air Handling Units",
      budgetCents: 11200000,
      committedCents: 9800000,
      actualCents: 9200000,
      billedCents: 7600000,
      alertThresholdBps: 600,
      createdAt: daysAgo(85),
      updatedAt: daysAgo(1),
    },
    {
      id: "bcc_transit_104400",
      organizationId: org2,
      projectId: "proj_northline_transit_hub",
      code: "10-4400",
      name: "Wayfinding and Signage",
      budgetCents: 3900000,
      committedCents: 3100000,
      actualCents: 2950000,
      billedCents: 2800000,
      alertThresholdBps: 600,
      createdAt: daysAgo(90),
      updatedAt: daysAgo(1),
    },
  ]);

  await db.insert(budgetProjectSettings).values([
    {
      id: "bps_harbor",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      alertThresholdBps: 700,
      createdAt: daysAgo(120),
      updatedAt: daysAgo(1),
    },
    {
      id: "bps_data",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      alertThresholdBps: 650,
      createdAt: daysAgo(85),
      updatedAt: daysAgo(1),
    },
    {
      id: "bps_transit",
      organizationId: org2,
      projectId: "proj_northline_transit_hub",
      alertThresholdBps: 600,
      createdAt: daysAgo(90),
      updatedAt: daysAgo(1),
    },
  ]);

  await db.insert(budgetCostEntries).values([
    {
      id: "bce_harbor_po_steel",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      costCodeId: "bcc_harbor_055000",
      entryType: "committed",
      sourceType: "purchase_order",
      sourceId: "po_harbor_steel",
      sourceRef: "PO-HMT-1024",
      amountCents: 24500000,
      currency: ensureCurrency("USD"),
      occurredAt: daysAgo(20),
      notes: "Steel package commitment",
      metadata: { vendor: "Atlas Steel Works" },
      createdByUserId: "usr_summit_procurement",
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20),
    },
    {
      id: "bce_harbor_invoice_steel",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      costCodeId: "bcc_harbor_055000",
      entryType: "actual",
      sourceType: "invoice",
      sourceId: "inv_harbor_steel_01",
      sourceRef: "INV-ASW-7781",
      amountCents: 6125000,
      currency: ensureCurrency("USD"),
      occurredAt: daysAgo(3),
      notes: "Progress invoice",
      metadata: { matchedBy: "match_harbor_steel_01" },
      createdByUserId: "usr_summit_finance",
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    {
      id: "bce_data_invoice_hvac",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      costCodeId: "bcc_data_237313",
      entryType: "billed",
      sourceType: "invoice",
      sourceId: "inv_data_hvac_01",
      sourceRef: "INV-AFM-0092",
      amountCents: 2800000,
      currency: ensureCurrency("USD"),
      occurredAt: daysAgo(2),
      notes: "Held pending backup",
      metadata: { holdReason: "documentation-gap" },
      createdByUserId: "usr_summit_finance",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
  ]);

  await db.insert(budgetAlerts).values([
    {
      id: "balert_harbor_055000",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      costCodeId: "bcc_harbor_055000",
      severity: "high",
      narrative:
        "Metal fabrication spend trending 11% above earned-value curve.",
      createdAt: daysAgo(1),
      resolvedAt: null,
    },
    {
      id: "balert_data_237313",
      organizationId: org1,
      projectId: "proj_summit_data_center",
      costCodeId: "bcc_data_237313",
      severity: "medium",
      narrative: "HVAC package awaiting support docs before payment release.",
      createdAt: daysAgo(1),
      resolvedAt: null,
    },
  ]);

  await db.insert(smartMailAccounts).values([
    {
      id: "smacct_summit_dana",
      organizationId: org1,
      userId: "usr_summit_pm_harbor",
      provider: "microsoft",
      email: "dana.patel@summitbuild.com",
      status: "connected",
      accessToken: "seed_access_token_dana",
      refreshToken: "seed_refresh_token_dana",
      tokenExpiresAt: daysFromNow(20),
      connectedAt: daysAgo(90),
      lastSyncAt: daysAgo(1),
      syncCursor: "cursor-dana-102",
      lastSyncStatus: "ok",
      lastSyncError: null,
      autoSyncEnabled: true,
      defaultProjectId: "proj_summit_harbor_tower",
      revokedAt: null,
      metadata: { mailboxRegion: "us-west-2" },
      createdAt: daysAgo(90),
      updatedAt: daysAgo(1),
    },
    {
      id: "smacct_north_isaac",
      organizationId: org2,
      userId: "usr_northline_pm",
      provider: "google",
      email: "isaac.wilson@northlineinfra.com",
      status: "connected",
      accessToken: "seed_access_token_isaac",
      refreshToken: "seed_refresh_token_isaac",
      tokenExpiresAt: daysFromNow(18),
      connectedAt: daysAgo(80),
      lastSyncAt: daysAgo(1),
      syncCursor: "cursor-isaac-77",
      lastSyncStatus: "ok",
      lastSyncError: null,
      autoSyncEnabled: true,
      defaultProjectId: "proj_northline_transit_hub",
      revokedAt: null,
      metadata: { mailboxRegion: "us-central-1" },
      createdAt: daysAgo(80),
      updatedAt: daysAgo(1),
    },
  ]);

  await db.insert(smartMailThreads).values([
    {
      id: "smthread_harbor_rfi_18",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      accountId: "smacct_summit_dana",
      subject: "RFI-18: Core wall embed clarification",
      externalThreadId: "outlook-thread-9911",
      participants: [
        "dana.patel@summitbuild.com",
        "pm@aeroflowmech.com",
        "design@arcstudio.com",
      ],
      lastMessageAt: daysAgo(1),
      linkedEntityType: "rfq",
      linkedEntityId: "rfq_harbor_steel",
      createdAt: daysAgo(7),
      updatedAt: daysAgo(1),
    },
    {
      id: "smthread_transit_submittal",
      organizationId: org2,
      projectId: "proj_northline_transit_hub",
      accountId: "smacct_north_isaac",
      subject: "Submittal package for signage revision",
      externalThreadId: "gmail-thread-4488",
      participants: ["isaac.wilson@northlineinfra.com", "admin@metrosign.io"],
      lastMessageAt: daysAgo(1),
      linkedEntityType: "change_order",
      linkedEntityId: "co_transit_signage_route",
      createdAt: daysAgo(5),
      updatedAt: daysAgo(1),
    },
  ]);

  await db.insert(smartMailMessages).values([
    {
      id: "smmsg_harbor_1",
      threadId: "smthread_harbor_rfi_18",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      externalMessageId: "outlook-msg-1001",
      direction: "inbound",
      status: "received",
      fromEmail: "design@arcstudio.com",
      toEmail: "dana.patel@summitbuild.com",
      ccEmails: ["pm@aeroflowmech.com"],
      bccEmails: [],
      subject: "RFI-18 response draft",
      body: "Attached revised embed detail. Confirm field fit before pour.",
      linkedEntityType: "rfq",
      linkedEntityId: "rfq_harbor_steel",
      linkConfidenceBps: 8800,
      linkReason: "RFI number and project code match",
      linkOverriddenByUserId: null,
      linkOverriddenAt: null,
      aiDraft: 0,
      isAiDraft: false,
      aiModel: null,
      aiPromptTemplateVersion: null,
      sendError: null,
      providerMetadata: { importance: "normal" },
      externalCreatedAt: daysAgo(2),
      sentAt: daysAgo(2),
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      id: "smmsg_harbor_2",
      threadId: "smthread_harbor_rfi_18",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      externalMessageId: "outlook-msg-1002",
      direction: "outbound",
      status: "sent",
      fromEmail: "dana.patel@summitbuild.com",
      toEmail: "design@arcstudio.com",
      ccEmails: ["pm@aeroflowmech.com"],
      bccEmails: [],
      subject: "Re: RFI-18 response draft",
      body: "Field fit confirmed. Proceeding with updated embed spacing.",
      linkedEntityType: "rfq",
      linkedEntityId: "rfq_harbor_steel",
      linkConfidenceBps: 9200,
      linkReason: "thread-linked",
      linkOverriddenByUserId: null,
      linkOverriddenAt: null,
      aiDraft: 1,
      isAiDraft: false,
      aiModel: "gpt-4.1-mini",
      aiPromptTemplateVersion: "v2.1",
      sendError: null,
      providerMetadata: { sentiment: "neutral" },
      externalCreatedAt: daysAgo(1),
      sentAt: daysAgo(1),
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ]);

  await db.insert(smartMailTemplates).values([
    {
      id: "smtpl_harbor_rfi",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      createdByUserId: "usr_summit_pm_harbor",
      name: "RFI Follow-up",
      type: "template",
      subjectTemplate: "[{{projectCode}}] Follow-up on {{topic}}",
      bodyTemplate:
        "Hi {{recipientName}},\n\nFollowing up on {{topic}} for {{projectName}}.\n\nThanks,\n{{senderName}}",
      variables: [
        "projectCode",
        "topic",
        "recipientName",
        "projectName",
        "senderName",
      ],
      isShared: true,
      metadata: { category: "coordination" },
      createdAt: daysAgo(30),
      updatedAt: daysAgo(2),
      deletedAt: null,
    },
    {
      id: "smtpl_north_submittal",
      organizationId: org2,
      projectId: "proj_northline_transit_hub",
      createdByUserId: "usr_northline_pm",
      name: "Submittal Acknowledgement",
      type: "snippet",
      subjectTemplate: "",
      bodyTemplate:
        "Received. Team review by {{reviewDate}} and return comments thereafter.",
      variables: ["reviewDate"],
      isShared: true,
      metadata: { category: "submittals" },
      createdAt: daysAgo(18),
      updatedAt: daysAgo(2),
      deletedAt: null,
    },
  ]);

  await db.insert(smartMailSyncRuns).values([
    {
      id: "smsync_dana_1",
      accountId: "smacct_summit_dana",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      status: "success",
      fetchedCount: 34,
      upsertedCount: 9,
      cursorBefore: "cursor-dana-101",
      cursorAfter: "cursor-dana-102",
      error: null,
      metadata: { latencyMs: 728 },
      startedAt: daysAgo(1),
      completedAt: daysAgo(1),
      createdAt: daysAgo(1),
    },
    {
      id: "smsync_isaac_1",
      accountId: "smacct_north_isaac",
      organizationId: org2,
      projectId: "proj_northline_transit_hub",
      status: "success",
      fetchedCount: 18,
      upsertedCount: 5,
      cursorBefore: "cursor-isaac-76",
      cursorAfter: "cursor-isaac-77",
      error: null,
      metadata: { latencyMs: 641 },
      startedAt: daysAgo(1),
      completedAt: daysAgo(1),
      createdAt: daysAgo(1),
    },
  ]);

  await db.insert(integrations).values([
    {
      id: "int_summit_procore",
      organizationId: org1,
      provider: "procore",
      name: "Procore Production",
      status: "connected",
      config: {
        companyId: "pc-4432",
        syncedModules: ["cost", "submittals", "rfi"],
      },
      lastSyncAt: daysAgo(1),
      createdAt: daysAgo(200),
      updatedAt: daysAgo(1),
    },
    {
      id: "int_summit_quickbooks",
      organizationId: org1,
      provider: "quickbooks",
      name: "QBO Finance",
      status: "connected",
      config: { realmId: "987654321", departmentsEnabled: true },
      lastSyncAt: daysAgo(1),
      createdAt: daysAgo(180),
      updatedAt: daysAgo(1),
    },
    {
      id: "int_north_viewpoint",
      organizationId: org2,
      provider: "viewpoint",
      name: "Vista ERP",
      status: "error",
      config: { endpoint: "https://erp.northline.local/api" },
      lastSyncAt: daysAgo(2),
      createdAt: daysAgo(170),
      updatedAt: daysAgo(1),
    },
  ]);

  await db.insert(billingRecords).values([
    {
      id: "bill_summit_march",
      organizationId: org1,
      projectId: null,
      reference: "BILL-2026-03-SUMMIT",
      amountCents: 482000,
      currency: "USD",
      status: "issued",
      dueDate: daysFromNow(7),
      paidAt: null,
      stripePaymentIntentId: "pi_3NseedSummit",
      stripeCustomerId: "cus_summit_001",
      subscriptionId: "sub_summit_001",
      metadata: { seats: 42, aiCreditsUsed: 18200 },
      createdAt: daysAgo(3),
      updatedAt: daysAgo(2),
      deletedAt: null,
    },
    {
      id: "bill_northline_march",
      organizationId: org2,
      projectId: null,
      reference: "BILL-2026-03-NORTH",
      amountCents: 165000,
      currency: "USD",
      status: "paid",
      dueDate: daysAgo(6),
      paidAt: daysAgo(8),
      stripePaymentIntentId: "pi_3NseedNorth",
      stripeCustomerId: "cus_north_001",
      subscriptionId: "sub_north_001",
      metadata: { seats: 14, aiCreditsUsed: 5200 },
      createdAt: daysAgo(10),
      updatedAt: daysAgo(8),
      deletedAt: null,
    },
  ]);

  await db.insert(stripeWebhookEvents).values([
    {
      id: "swevt_1",
      stripeEventId: "evt_1SeedInvoicePaid",
      eventType: "invoice.paid",
      processingStatus: "processed",
      payload: { customer: "cus_north_001", amount_paid: 165000 },
      error: null,
      processedAt: daysAgo(8),
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    },
    {
      id: "swevt_2",
      stripeEventId: "evt_1SeedPaymentFailed",
      eventType: "invoice.payment_failed",
      processingStatus: "failed",
      payload: { customer: "cus_summit_001", amount_due: 482000 },
      error: "card_declined",
      processedAt: daysAgo(2),
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
  ]);

  await db.insert(notifications).values([
    {
      id: "notif_summit_1",
      organizationId: org1,
      userId: "usr_summit_pm_harbor",
      type: "change_order",
      title: "Change order awaiting decision",
      body: "Add Chiller Redundancy Loop is waiting for executive decision.",
      metadata: { entityId: "co_harbor_chiller", severity: "high" },
      readAt: null,
      createdAt: daysAgo(1),
    },
    {
      id: "notif_summit_2",
      organizationId: org1,
      userId: "usr_summit_finance",
      type: "invoice",
      title: "Invoice on hold",
      body: "INV-AFM-0092 requires additional supporting documentation.",
      metadata: { entityId: "inv_data_hvac_01", severity: "medium" },
      readAt: null,
      createdAt: daysAgo(1),
    },
    {
      id: "notif_north_1",
      organizationId: org2,
      userId: "usr_northline_pm",
      type: "integration",
      title: "ERP sync failed",
      body: "Vista ERP connector reported authentication failure.",
      metadata: { integrationId: "int_north_viewpoint" },
      readAt: daysAgo(1),
      createdAt: daysAgo(1),
    },
  ]);

  await db.insert(fileAssets).values([
    {
      id: "fa_atlas_insurance",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      entityType: "compliance_item",
      entityId: "comp_atlas_insurance",
      uploadedByUserId: "usr_summit_safety",
      bucket: "foreman-seed-assets",
      storageKey: "org_summit_build/compliance/atlas-insurance-2026.pdf",
      fileName: "atlas-insurance-2026.pdf",
      contentType: "application/pdf",
      sizeBytes: 284931,
      status: "uploaded",
      eTag: "etag-seed-1",
      metadata: { sha256: "seed-sha-1" },
      uploadedAt: daysAgo(1),
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
      deletedAt: null,
    },
    {
      id: "fa_harbor_snapshot",
      organizationId: org1,
      projectId: "proj_summit_harbor_tower",
      entityType: "site_snap",
      entityId: "snap_harbor_core",
      uploadedByUserId: "usr_summit_field_1",
      bucket: "foreman-seed-assets",
      storageKey: "org_summit_build/site-snaps/harbor-core-1.jpg",
      fileName: "harbor-core-1.jpg",
      contentType: "image/jpeg",
      sizeBytes: 948221,
      status: "uploaded",
      eTag: "etag-seed-2",
      metadata: { width: 1920, height: 1080 },
      uploadedAt: daysAgo(2),
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
      deletedAt: null,
    },
  ]);

  await db.insert(organizationSubscriptions).values([
    {
      id: "subscr_summit",
      organizationId: org1,
      plan: "enterprise",
      status: "active",
      aiCreditsIncluded: 50000,
      aiCreditsUsed: 18200,
      allowOverage: true,
      overagePriceCents: 4,
      cycleStartAt: daysAgo(9),
      cycleEndAt: daysFromNow(21),
      graceEndsAt: null,
      metadata: { billingContact: "finance@summitbuild.com" },
      createdAt: daysAgo(180),
      updatedAt: daysAgo(1),
    },
    {
      id: "subscr_north",
      organizationId: org2,
      plan: "growth",
      status: "active",
      aiCreditsIncluded: 15000,
      aiCreditsUsed: 5200,
      allowOverage: false,
      overagePriceCents: 0,
      cycleStartAt: daysAgo(9),
      cycleEndAt: daysFromNow(21),
      graceEndsAt: null,
      metadata: { billingContact: "ap@northlineinfra.com" },
      createdAt: daysAgo(170),
      updatedAt: daysAgo(1),
    },
  ]);

  await db.insert(usageEvents).values([
    {
      id: "usage_summit_ai_1",
      organizationId: org1,
      subscriptionId: "subscr_summit",
      eventType: "ai_generation",
      feature: "site_snap_observation",
      units: 820,
      source: "sitesnap",
      model: "gpt-4.1-mini",
      metadata: { snapId: "snap_harbor_core" },
      createdAt: daysAgo(1),
    },
    {
      id: "usage_summit_ai_2",
      organizationId: org1,
      subscriptionId: "subscr_summit",
      eventType: "ai_generation",
      feature: "budget_narrative",
      units: 410,
      source: "budgets",
      model: "gpt-4.1-mini",
      metadata: { costCodeId: "bcc_harbor_055000" },
      createdAt: daysAgo(1),
    },
    {
      id: "usage_north_ai_1",
      organizationId: org2,
      subscriptionId: "subscr_north",
      eventType: "ai_generation",
      feature: "mail_linking",
      units: 230,
      source: "smartmail",
      model: "gpt-4.1-mini",
      metadata: { threadId: "smthread_transit_submittal" },
      createdAt: daysAgo(1),
    },
  ]);

  await db.insert(auditLogs).values([
    {
      id: "audit_1",
      organizationId: org1,
      actorUserId: "usr_summit_procurement",
      entityType: "purchase_order",
      entityId: "po_harbor_steel",
      action: "create",
      beforeData: {},
      afterData: { poNumber: "PO-HMT-1024", amount: 24500000 },
      metadata: { source: "seed" },
      createdAt: daysAgo(20),
    },
    {
      id: "audit_2",
      organizationId: org1,
      actorUserId: "usr_summit_finance",
      entityType: "invoice",
      entityId: "inv_data_hvac_01",
      action: "reject",
      beforeData: { status: "submitted" },
      afterData: { status: "hold" },
      metadata: { reason: "documentation-gap" },
      createdAt: daysAgo(1),
    },
    {
      id: "audit_3",
      organizationId: org2,
      actorUserId: "usr_northline_pm",
      entityType: "change_order",
      entityId: "co_transit_signage_route",
      action: "create",
      beforeData: {},
      afterData: { status: "submitted" },
      metadata: { source: "seed" },
      createdAt: daysAgo(2),
    },
  ]);

  const counts = {
    users: userRows.length,
    organizations: 2,
    projects: projectRows.length,
    subcontractors: 4,
    purchaseOrders: 4,
    invoices: 4,
    changeOrders: 3,
    siteSnaps: 2,
    smartMailThreads: 2,
    notifications: 3,
  };

  // eslint-disable-next-line no-console
  console.log("Seed complete", counts);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed", error);
    process.exit(1);
  });
